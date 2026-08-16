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
- `app/routers/sales.py` — `GET /api/sales/forecast-ml` (admin-only, mesmo padrão de
  `/api/sales/forecast`).
- `app/schemas/sales.py::SalesMLForecastResponse` — `{ forecast: SalesForecastPoint[], model_available }`,
  reaproveitando `SalesForecastPoint` (`date` / `actual` / `predicted`) que `/forecast` já expõe.
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

Ainda falta, se algum dia for necessário: uma rota/UI pra admin cadastrar eventos ad-hoc
(promoção fora do calendário fixo) sem precisar editar o SQL — não construída agora porque
o seed cobre o caso de uso atual (treinar o modelo); adicionar CRUD só quando alguém
precisar editar isso em runtime.

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

Depois de rodar, **reinicie a API** — `forecaster.load_model()` é cacheado por processo
(`@lru_cache`), então um treino rodado num processo separado não atualiza um servidor já
em execução.

Falta ainda:

- ~~Volume mínimo de dados históricos~~ — ✅ resolvido pra fins de treino/demo por
  `import_data/10_sales_training_seed.sql`: 584 dias de receita **sintética**
  (2025-01-01 a 2026-08-07), com padrão correlacionado a `calendar_context` (payday,
  fim de mês, fim de semana, feriado, Black Friday) pra dar sinal de verdade ao modelo —
  ver o arquivo pra detalhes e o aviso sobre rodar isso só em banco de dev/staging (ele
  escreve na mesma tabela `sales` que `GET /api/metrics` e `GET /api/sales/forecast`
  leem). Pra dados de venda **reais**, essa pendência continua: o histórico de produção
  ainda vai levar meses pra acumular volume suficiente por conta própria.
- **Decisão de re-treino.** O modelo serializado fica estático até alguém rodar
  `python -m app.ml.train` de novo manualmente — não há job agendado. Se o padrão de
  vendas mudar (nova sazonalidade, novos produtos), o modelo vai ficar desatualizado
  silenciosamente. Vale um cron (GitHub Actions agendado, ou um worker separado — não há
  infra de jobs no projeto hoje) pra re-treinar periodicamente e reiniciar a API.

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
| Rodar `python -m app.ml.train` e reiniciar a API | pendente (rodar após aplicar os seeds acima) | `model_available: true` no endpoint |
| Re-treino periódico (cron/job) | não construído | Modelo ficar atualizado com o tempo |
