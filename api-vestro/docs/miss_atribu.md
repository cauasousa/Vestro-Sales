# Pendências — Forecast com LightGBM (`GET /api/sales/forecast-ml`)

Este documento lista o que falta pra sair do estado atual (endpoint no ar, mas sempre
devolvendo `forecast: []` / `model_available: false`) até ter uma previsão real vinda de
um modelo treinado.

Código já integrado nesta branch:

- `app/ml/forecaster.py` — `build_features_for_date`, `load_model`, `predict_next_day`.
- `app/ml/train.py` — script de treino (`python -m app.ml.train`), ver §2.
- `app/services/forecast.py::get_ml_forecast` — prevê os próximos `FORECAST_DAYS` (7) dias,
  um de cada vez: cada previsão vira histórico pro `rolling_mean_7d` do dia seguinte
  (walk-forward), igual ao horizonte que `/api/sales/forecast` já usa pro modelo linear.
- `app/routers/sales.py` — `GET /api/sales/forecast-ml`, `POST /api/sales/retrain`,
  `GET|POST /api/sales/calendar-context`, `DELETE /api/sales/calendar-context/{date}`
  (todas admin-only, mesmo padrão de `/api/sales/forecast`).
- `app/schemas/sales.py` — `SalesMLForecastResponse` (reaproveita `SalesForecastPoint` que
  `/forecast` já expõe), `SalesRetrainResponse`, `CalendarContextIn`/`CalendarContextEntry`.
- `app/ml/calendar.py::derive_calendar_fields` — calcula `is_payday`/`is_end_of_month`/
  `is_holiday`/`days_until_holiday` a partir de uma data, usado pelo upsert da rota.
- `app/services/calendar_context.py` — list/upsert/delete de `calendar_context`.
- `app/services/scheduler.py::daily_retrain_loop` + `lifespan` em `app/main.py` — re-treina
  sozinho todo dia às 00:00 UTC, ver §2.
- `requirements.txt` — `lightgbm`, `pandas`, `joblib` (+ transitivas: `numpy`, `scipy`,
  `python-dateutil`, `six`, `tzdata`) já instaladas no `.venv` e pinadas no arquivo.

O endpoint funciona sem nenhuma das pendências abaixo — degrada para
`model_available: false` / `forecast: []` em vez de dar 500. As pendências são pra ligar a
previsão de verdade.

## 1. Tabela `calendar_context` — ✅ schema pronto, seed disponível

A tabela agora está documentada em `docs/database-schema.md` §1.9/§2 (DDL + RLS,
admin-only tanto leitura quanto escrita) e tem um seed pronto:
`import_data/09_calendar_context.sql`. Rode o SQL do §2 do schema (ou só o `create table`
de `calendar_context` + as duas policies, se o resto do schema já estiver aplicado) e
depois o seed, na ordem indicada em `import_data/00_README.md`.

O seed cobre 2025-01-01 a 2026-08-23 (a mesma janela histórica do seed de treino, `10_`,
mais os 7 dias que `GET /api/sales/forecast-ml` prevê a partir de hoje) e resolve as duas
pendências que existiam aqui:

- **`is_payday` / `is_end_of_month`** são derivados direto da data (dia 5/20 do mês,
  últimos 3 dias do mês) — não dependem de cadastro manual dia a dia.
- **`days_until_holiday` / `is_holiday` / `discount_rate` / `has_event`** vêm de uma lista
  de feriados US fixa (New Year, 4th of July, Thanksgiving, Christmas) + duas datas de
  Black Friday, embutidas no próprio seed — atualizar essa lista à mão quando o range de
  datas crescer além de 2026.

Rota admin pra cadastrar isso em runtime — ✅ construída, `app/routers/sales.py`:

- `GET /api/sales/calendar-context?start=&end=` — lista o range (default: hoje até +60 dias).
- `POST /api/sales/calendar-context` — upsert de 1 dia. Body é `CalendarContextIn`:
  só `date`, `discount_rate` (0–1) e `has_event` — são os **únicos** dois campos que são
  decisão de negócio de verdade (uma promoção planejada, um push de marketing). `is_payday`
  / `is_end_of_month` / `is_holiday` / `days_until_holiday` são calculados a partir da
  `date` por `app/ml/calendar.py::derive_calendar_fields` (mesma lista de feriados fixa do
  seed) e sobrescritos a cada upsert — não dá pra mandar esses 4 campos manualmente por
  design, pra não divergirem do que o resto do sistema calcula.
- `DELETE /api/sales/calendar-context/{date}` — remove uma linha (404 se não existir).

Se o range de datas crescer além de 2026 (ou passar a valer fora dos EUA), atualizar a
lista de feriados em dois lugares — não há uma fonte única: `US_HOLIDAYS` em
`app/ml/calendar.py` (usada pela rota) e a CTE `holidays` no topo de
`import_data/09_calendar_context.sql` (usada só pro backfill em massa). Hoje as duas
listas têm as mesmas datas; se divergirem, dias inseridos via seed e via rota vão
calcular `days_until_holiday`/`is_holiday` diferente pro mesmo dia.

## 2. Modelo treinado (`app/ml/saved_models/lgb_sales_model.pkl`)

O script de treino já existe (`app/ml/train.py`) mas ninguém rodou ele ainda contra dados
reais — não há `.pkl` no repo (e não deve haver: modelo treinado é artefato de build, não
código-fonte). `forecaster.load_model()` procura o arquivo em
`app/ml/saved_models/lgb_sales_model.pkl` (path configurável via `SALES_MODEL_PATH` no
`.env`, `app/config.py::sales_model_path`) e retorna `None` se não encontrar — é por isso
que o endpoint hoje sempre responde `model_available: false`.

Rodar o treino (com o `.venv` ativado, na raiz do projeto):

```
python -m app.ml.train
```

O que o script faz:

1. Puxa o histórico completo de `sales` (todos os registros, não só os 7/14 dias que os
   endpoints usam em produção) agregado por dia.
2. Junta com o histórico de `calendar_context` pra cada um desses dias (pendência #1 —
   sem essa tabela populada, todo dia treina com as features contextuais em default, só
   `day_of_week` / `is_weekend` / `rolling_mean_7d` carregam sinal de verdade).
3. Monta a matriz de features chamando `forecaster.build_features_for_date` — a mesma
   função usada em produção por `get_ml_forecast`, então não há risco de train/serve skew.
4. Treina um `lightgbm.LGBMRegressor` com split temporal (últimos `--holdout-days`, default
   14, viram validação — nunca split aleatório, que vazaria futuro pro treino) e imprime o
   MAE do holdout.
5. Salva com `joblib.dump(model, settings.sales_model_path)`.

Rodar pela API em vez do shell — ✅ construído: `POST /api/sales/retrain?holdout_days=14`
(admin-only, `app/routers/sales.py` → `app/services/forecast.py::retrain_model`). Faz a
mesma coisa que o script, mas via `run_in_threadpool` (não bloqueia o event loop) e, no
final, chama `forecaster.load_model.cache_clear()` — então, ao contrário de rodar
`python -m app.ml.train` num shell separado, **não precisa reiniciar a API**: a próxima
chamada a `GET /api/sales/forecast-ml` no mesmo processo já usa o modelo novo. Retorna
`SalesRetrainResponse { trained_days, holdout_days, holdout_mae, model_path }`, ou
`400` se ainda não houver os `MIN_TRAINING_DAYS` (14) de histórico em `sales`.

Falta ainda:

- ~~Volume mínimo de dados históricos~~ — ✅ resolvido pra fins de treino/demo por
  `import_data/10_sales_training_seed.sql`: 584 dias de receita **sintética**
  (2025-01-01 a 2026-08-07), com padrão correlacionado a `calendar_context` (payday,
  fim de mês, fim de semana, feriado, Black Friday) pra dar sinal de verdade ao modelo —
  ver o arquivo pra detalhes e o aviso sobre rodar isso só em banco de dev/staging (ele
  escreve na mesma tabela `sales` que `GET /api/metrics` e `GET /api/sales/forecast`
  leem). Pra dados de venda **reais**, essa pendência continua: o histórico de produção
  ainda vai levar meses pra acumular volume suficiente por conta própria.
- ~~Decisão de re-treino automático~~ — ✅ construído: `app/services/scheduler.py::daily_retrain_loop`,
  ligado no `lifespan` de `app/main.py`. Um loop assíncrono roda dentro do próprio processo
  da API, dorme até 00:00 UTC do dia seguinte, chama `retrain_model()` (mesmo código do
  `POST /api/sales/retrain`) e volta a dormir. Uma falha (ex.: `sales` ainda sem os 14 dias
  mínimos) só loga (`print("[daily_retrain] failed: ...")`) e tenta de novo no dia
  seguinte — não derruba o loop nem a API.

  **Limitação conhecida**: isso roda *dentro do processo* — funciona bem pra 1 worker/réplica.
  Se a API algum dia rodar com múltiplos workers (`uvicorn --workers N`) ou múltiplas
  réplicas atrás de um load balancer, cada uma dispara seu próprio loop e todas re-treinam
  às 00:00 UTC independentemente — inofensivo (só redundante: N treinos idênticos gravando
  o mesmo `.pkl`), mas se isso incomodar, troque por um scheduler externo (cron job, GitHub
  Actions agendado) chamando `POST /api/sales/retrain` uma vez só, em vez do loop
  in-process.

## 3. Variáveis de ambiente

Nenhuma nova env var é obrigatória — `sales_model_path` tem default
(`app/ml/saved_models/lgb_sales_model.pkl`, relativo à raiz do processo). Só documentar
que dá pra sobrescrever via `.env`:

```
SALES_MODEL_PATH=app/ml/saved_models/lgb_sales_model.pkl
```

## Resumo do que falta pra virar previsão real

| Pendência | Status | Bloqueia |
|---|---|---|
| Tabela `calendar_context` + policies | ✅ `docs/database-schema.md` §1.9/§2 | Features contextuais (hoje sempre em default) |
| Seed pra popular `calendar_context` | ✅ `import_data/09_calendar_context.sql` | Dados chegarem na tabela acima |
| Histórico de vendas com volume p/ treinar | ✅ (sintético) `import_data/10_sales_training_seed.sql` | Treino não-trivial |
| Histórico de vendas **real** com volume real | ❌ leva meses pra acumular em produção | Modelo treinado com dados de verdade, não sintéticos |
| Rodar o treino (CLI, `POST /api/sales/retrain` ou o loop diário) | ✅ os três já rodam o mesmo `train()` | `model_available: true` no endpoint |
| Rota admin pra editar `calendar_context` em runtime | ✅ `GET/POST/DELETE /api/sales/calendar-context` | Cadastrar promoções/eventos sem editar SQL |
| Re-treino automático diário (00:00 UTC) | ✅ `app/services/scheduler.py` (in-process, ver §2) | Modelo ficar atualizado sem ação manual |
