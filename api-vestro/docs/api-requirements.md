# API Requirements — Vestro Sales

Levantamento de **tudo que hoje é mock/localStorage e vai precisar de uma API real**, com as rotas propostas. Serve de checklist para a migração MVP1 → MVP3 (ver roadmap em `docs/architecture.md`).

## 1. Estado atual (por que isso é necessário)

Nenhuma rota de API existe no projeto (`src/app/api/` não existe). Toda "persistência" é `localStorage` no browser:

| Domínio | Arquivo mock | Storage key |
|---|---|---|
| Produtos | `src/lib/product-data.ts` | `vestro_products` |
| Usuários / Auth | `src/lib/user-store.ts` + `src/hooks/useAuthMock.ts` | `vestro_users`, `vestro_auth_user` |
| Pedidos | `src/lib/orders.ts` | `vestro_last_order` |
| Carrinho | `src/hooks/useCart.tsx` | `vestro_cart` |
| Chat/suporte | `src/lib/chat-store.ts` | `vestro_chat` |
| Métricas/vendas | `src/lib/mock-admin.ts` | (hardcoded, sem storage) |
| Newsletter | `src/components/NewsletterCTA.tsx` | (só estado local, não persiste nada) |

Isso significa: sem multiusuário real, sem persistência entre dispositivos/navegadores, senhas em texto puro no client, e sem dado nenhum sobrevivendo a um `localStorage.clear()`.

⚠️ **Duas fontes de verdade conflitantes já existem no código** e uma decisão precisa ser tomada antes de implementar:

1. `src/lib/api.ts` — client REST genérico, usa `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`), já chama 3 rotas que **não existem em lugar nenhum ainda**.
2. `src/lib/supabaseClient.ts` + `schema.sql` — client Supabase completo com tabelas, RLS e triggers já prontos, mas **nunca importado/usado** em nenhuma page/hook.

Recomendação: usar Supabase como backend (schema já modelado com RLS) e implementar `src/app/api/**` como *Next.js Route Handlers* finos que chamam o Supabase com a service role quando precisar de lógica que não pode rodar no client (ex: IA, agregações). Isso também resolve as 3 rotas que `api.ts` já espera.

---

## 2. Rotas já referenciadas no código (implementar primeiro)

`src/lib/api.ts` chama estas 3 rotas via `fetch(`${NEXT_PUBLIC_API_URL}...`)`, com fallback silencioso hoje (`ai-assistant/page.tsx` cai para `assistant-fallback.ts` se a call falhar):

| Método | Rota | Chamada por | Request body | Response | Auth |
|---|---|---|---|---|---|
| `GET` | `/api/sales/forecast` | (nenhuma page usa hoje — `admin/page.tsx` ainda lê `mock-admin.ts` direto) | — | `{ history: SalesForecastPoint[], forecast: SalesForecastPoint[] }` | Bearer token (manager) |
| `POST` | `/api/ai/assistant` | `admin/ai-assistant/page.tsx` | `{ prompt: string }` | `{ answer: string }` | Bearer token (manager) |
| `POST` | `/api/ai/summarize-feedback` | (nenhuma page usa ainda) | — | `{ summary: string }` | Bearer token (manager) |

`SalesForecastPoint` = `{ date: string; actual: number | null; predicted: number | null }` (`src/lib/types.ts`).

---

## 3. Auth

Hoje: `useAuthMock.ts` compara senha em texto puro contra `vestro_users` no localStorage. Substituir por Supabase Auth (o `schema.sql` já tem o trigger `handle_new_user` criando `profiles` a partir de `auth.users`).

| Método | Rota | Request | Response | Notas |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `{ full_name, email, password }` | `{ user: Profile, session }` | Hoje: `user-store.ts::createUser` (role fixo `client`). Deve chamar `supabase.auth.signUp`. |
| `POST` | `/api/auth/login` | `{ email, password }` | `{ user: Profile, session }` | Hoje: `useAuthMock::login`. `supabase.auth.signInWithPassword`. |
| `POST` | `/api/auth/logout` | — | `204` | Hoje: só limpa localStorage. |
| `GET` | `/api/auth/me` | — (Bearer token) | `Profile` | Usado pelo `AdminLayout` pra checar `role === 'admin'` (schema usa `admin`/`customer`; types atuais usam `manager`/`client` — **precisa unificar os nomes de role**, ver seção 9). |

---

## 4. Produtos (`src/lib/product-data.ts`)

Tabela já existe: `public.products` (RLS: leitura pública só de `is_active = true`, escrita só admin).

| Método | Rota | Request | Response | Auth | Usado por |
|---|---|---|---|---|---|
| `GET` | `/api/products` | query: `?category=&search=` | `Product[]` | público | `useProducts.ts`, landing page |
| `GET` | `/api/products?featured=true&limit=4` | — | `Product[]` | público | landing page (`getFeaturedProducts`) |
| `GET` | `/api/products/:id` | — | `Product \| 404` | público | `products/[id]/page.tsx` |
| `GET` | `/api/products/categories` | — | `string[]` | público | filtros de catálogo |
| `POST` | `/api/products` | `ProductCreateInput` | `Product` | admin | `admin/products/page.tsx` |
| `PATCH` | `/api/products/:id` | `Partial<ProductCreateInput>` | `Product` | admin | `admin/products/page.tsx` |
| `DELETE` | `/api/products/:id` | — | `204` | admin | `admin/products/page.tsx` |

`Product` = `{ id, name, description, category, price, stock, image_url, is_active, created_at, updated_at }` (`src/types/product.ts`).

---

## 5. Carrinho e Pedidos (`src/lib/orders.ts`, `src/hooks/useCart.tsx`)

Não existe tabela `orders`/`order_items` no `schema.sql` ainda — só `sales` (uma linha por item vendido, não um pedido agrupado). Precisa decidir: adaptar `sales` para virar o pedido, ou criar tabelas novas `orders` + `order_items`.

| Método | Rota | Request | Response | Auth | Notas |
|---|---|---|---|---|---|
| `POST` | `/api/orders` | `{ items: CartItem[], customer: Order['customer'] }` | `Order` | opcional (guest checkout hoje existe) | Substitui `createOrder()` local. Deve gravar em `sales` (uma linha por `CartItem`, ou nova tabela `orders`). |
| `GET` | `/api/orders/:id` | — | `Order \| 404` | dono do pedido ou admin | `checkout/success/page.tsx` hoje lê do localStorage. |
| `GET` | `/api/orders` | — | `Order[]` | cliente logado | "Order history" listado no roadmap (`README.md`), ainda não tem UI. |

O checkout atual coleta `cardNumber/expiry/cvc` mas **não envia pra lugar nenhum** — é só decorativo. Ao integrar pagamento real (Stripe, roadmap "Future Phases"), esses campos não devem ir para a sua API; precisam ir direto pro Stripe Elements/Checkout.

---

## 6. Usuários / Admin (`src/lib/user-store.ts`, `admin/users/page.tsx`)

Tabela: `public.profiles`.

| Método | Rota | Request | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/users` | — | `Profile[]` | admin |
| `POST` | `/api/users` | `{ full_name, email, password, role }` | `Profile` | admin (hoje é criação livre via `/register`, mas a página admin também cria usuário direto — decidir se admin pode criar `manager`s) |

`admin/page.tsx` também usa `getUsers().length` só pra exibir "Total users" — isso pode virar um campo dentro da resposta de métricas (seção 7) em vez de rota própria.

---

## 7. Métricas / Dashboard (`src/lib/mock-admin.ts`)

| Método | Rota | Response | Auth |
|---|---|---|---|
| `GET` | `/api/metrics/summary` | `{ revenue, newCustomers, conversionRate, ordersCount, totalUsers }` | admin |
| `GET` | `/api/sales/forecast` | `{ history: SalesForecastPoint[], forecast: SalesForecastPoint[] }` | admin | já referenciada em `api.ts` (seção 2) |

`forecast` é uma previsão (ML/estatística) — precisa decidir se isso é calculado num job separado (cron gravando em `sales` ou tabela própria `forecasts`) ou gerado on-demand pela rota.

---

## 8. Chat / Suporte (`src/lib/chat-store.ts`)

Tabela existe: `public.chat_messages`, mas o schema atual é **1 mensagem = 1 pergunta + 1 `ai_response`**, enquanto o admin chat hoje modela **conversas com múltiplas mensagens indo e voltando** (`from: 'admin' | 'customer'`). Schema precisa ajuste (ou tabela nova `conversations` + `messages`) antes de implementar.

| Método | Rota | Request | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/chat/conversations` | — | `Conversation[]` | admin |
| `GET` | `/api/chat/conversations/:customerId` | — | `Conversation` | admin ou dono |
| `POST` | `/api/chat/conversations/:customerId/messages` | `{ text: string, from: 'admin' \| 'customer' }` | `Conversation` | admin ou dono |

Hoje as respostas do "cliente" no admin chat são só um `setTimeout` sorteando de um array fixo (`replies`) — não é real-time nem tem cliente do outro lado respondendo de fato.

---

## 9. AI Assistant (`assistant-fallback.ts` + `api.ts`)

Já coberto na seção 2 (`POST /api/ai/assistant`). O fallback atual (`assistant-fallback.ts`) é regra-based (keyword matching em `revenue`, `forecast`, `stock` etc.) e serve de referência do que a IA real precisa saber responder: receita, forecast, top produto, novos clientes, estoque baixo. Ao implementar a rota real, ela deve ter acesso a `mockMetrics`-equivalente real + `products` para responder essas mesmas perguntas.

---

## 10. Newsletter

Não referenciado em nenhum lugar do código hoje além do form decorativo em `NewsletterCTA.tsx` (não faz fetch nenhum, só troca de estado local). Precisa de:

| Método | Rota | Request | Response |
|---|---|---|---|
| `POST` | `/api/newsletter/subscribe` | `{ email: string }` | `204` |

Vai depender de um provedor externo (Mailchimp/Resend/SendGrid) — precisa de env var própria (`*_API_KEY`) quando for implementado.

---

## 11. Env vars necessárias

Já existem em `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

Vão faltar (adicionar quando as rotas correspondentes forem implementadas):
```
SUPABASE_SERVICE_ROLE_KEY=      # server-side only, usado pelos Route Handlers em src/app/api/**
OPENAI_API_KEY= (ou equivalente) # para /api/ai/assistant e /api/ai/summarize-feedback
STRIPE_SECRET_KEY=              # quando checkout virar pagamento real (roadmap "Future Phases")
NEWSLETTER_PROVIDER_API_KEY=    # Mailchimp/Resend/SendGrid para /api/newsletter/subscribe
```

---

## 12. Pendências de modelagem antes de codar

1. **Unificar nomes de role**: código usa `'manager' | 'client'` (`src/types/user.ts`), `schema.sql` usa `'admin' | 'customer'`. Escolher um.
2. **Pedidos**: `schema.sql` não tem tabela de pedido agrupado, só `sales` por item. Decidir `orders + order_items` vs. adaptar `sales`.
3. **Chat**: `chat_messages` no schema é 1 pergunta/1 resposta de IA; o admin chat implementado é uma conversa humana bidirecional. Schema precisa mudar.
4. **Duas fontes de client** (`api.ts` genérico vs `supabaseClient.ts`) — decidir se o front chama Supabase direto (client-side, com RLS) ou sempre via `src/app/api/**` (Route Handlers no meio). Recomendo Route Handlers para tudo que envolve IA/segredo de API key, e Supabase direto (client-side) para leituras públicas simples de produto.
