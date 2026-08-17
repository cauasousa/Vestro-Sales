# api-vestro — Vestro Sales Backend

FastAPI service powering [Vestro Sales](../README.md): REST API, Supabase-backed auth, sales analytics, LightGBM demand forecasting, and a Gemini-powered AI assistant.

## Overview

The backend is a FastAPI app (`app/main.py`) exposing REST endpoints under `/api/*`, plus `/` and `/health`. It authenticates via Supabase (bearer tokens verified against Supabase Auth, not decoded locally), stores its data in Supabase Postgres, and runs an in-process asyncio scheduler that retrains the sales-forecasting model daily so it never drifts too far from current data.

Two things make this more than a CRUD API:

1. **ML forecasting** — a LightGBM model predicts near-term sales from historical data plus calendar context (paydays, holidays, discounts, events), retrainable on demand or on a schedule.
2. **Grounded AI assistant** — a Gemini-backed chat endpoint answers admin questions using a live snapshot of the business's own data, not general knowledge, with a deterministic fallback if Gemini is unavailable.

## Architecture & Data Flow

```
Request ──▶ router (app/routers/*) ──▶ service (app/services/*) ──▶ Supabase (Postgres/Auth)
                                              │
                                              ├─▶ app/ml/forecaster.py ──▶ trained LightGBM model (.pkl)
                                              │
                                              └─▶ app/services/assistant.py ──▶ Gemini API
                                                        (falls back to keyword matching if unset/unavailable)
```

- **Auth**: every protected route depends on `get_current_profile` / `get_current_admin` (`app/auth.py`), which verifies the bearer token against Supabase and reads the caller's role from a `profiles` table.
- **Forecasting**: `GET /api/sales/forecast-ml` builds features for the next day from `app/ml/forecaster.py`, loads the cached model, and walks the prediction forward day by day, feeding each day's prediction into the next day's rolling mean. If no model has been trained yet, it returns `model_available: false` instead of erroring.
- **Retraining**: `POST /api/sales/retrain` (admin) and a daily background loop (`app/services/scheduler.py`) both call into `app/ml/train.py`, which pulls sales + calendar-context history from Supabase and fits a fresh `LGBMRegressor` on a temporal (never random) train/holdout split.
- **AI Assistant**: `POST /api/ai/assistant` (`app/services/assistant.py`) assembles a context string from Supabase — recent revenue, order counts, new customers, the next forecast point, the top-selling product, low-stock products — and sends it plus the admin's question to Gemini with a system instruction that restricts answers to that data, 1–3 sentences, plain text, 20s timeout. If `GEMINI_API_KEY` is unset or the call fails, it falls back to a keyword-matched answer over the same data instead of failing the request.

## Project Structure

```
app/
├── main.py                 # FastAPI app, CORS, router registration, lifespan (starts retrain loop)
├── config.py                # Settings (pydantic-settings, reads .env)
├── auth.py                   # Supabase token verification, role-gated dependencies
├── db.py                      # Supabase client helpers
├── routers/                    # One file per resource — request/response wiring only
│   ├── auth.py, products.py, orders.py, users.py, metrics.py, sales.py,
│   └── chat.py, ai.py, newsletter.py, discounts.py, calendar_events.py, marketing.py
├── services/                    # Business logic behind each router
│   ├── forecast.py, assistant.py, metrics.py, chat.py, orders.py,
│   └── discounts.py, calendar_context.py, calendar_events.py, marketing_email.py, feedback.py, scheduler.py
├── ml/
│   ├── forecaster.py            # Feature engineering + inference
│   ├── train.py                  # Model training (CLI: `python -m app.ml.train`, or programmatic)
│   ├── calendar.py                # Holiday/payday derivation
│   └── saved_models/               # Trained model artifact (gitignored, not shipped)
└── schemas/                          # Pydantic request/response models, one file per domain
```

## API Endpoints

Base path `/api`, unless noted. Most non-public routes require a Supabase bearer token; **(admin)** routes additionally require an admin role.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Root status message |
| GET | `/health` | Health check |
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current user profile |
| GET | `/products/categories` | List product categories |
| GET | `/products` | List/search/filter products (public) |
| GET | `/products/{id}` | Product detail |
| POST · PATCH · DELETE | `/products[/{id}]` | Manage products **(admin)** |
| POST | `/orders` | Place an order (guest checkout supported) |
| GET | `/orders` | List orders (own, or all if admin) |
| GET | `/orders/{id}` | Order detail (owner or admin) |
| GET · POST | `/users` | List / create users **(admin)** |
| GET | `/metrics/summary` | Sales/business summary **(admin)** |
| GET | `/sales/forecast` | Linear-trend forecast **(admin)** |
| GET | `/sales/forecast-ml` | LightGBM forecast **(admin)** |
| POST | `/sales/retrain` | Retrain the model on demand **(admin)** |
| GET · POST | `/sales/calendar-context` | Manage per-day forecast context (discounts, events) **(admin)** |
| DELETE | `/sales/calendar-context/{date}` | Remove a day's context **(admin)** |
| GET · POST | `/sales/calendar-events` | Manage calendar events **(admin)** |
| PATCH · DELETE | `/sales/calendar-events/{id}` | Update/remove a calendar event **(admin)** |
| GET | `/chat/conversations` | List support conversations **(admin)** |
| GET | `/chat/conversations/{customer_id}` | Conversation detail (owner or admin) |
| POST | `/chat/conversations/{customer_id}/messages` | Send a chat message (owner or admin) |
| POST | `/chat/conversations/{customer_id}/report` | Report a conversation (owner or admin) |
| POST | `/ai/assistant` | Ask the Gemini-backed assistant a question **(admin)** |
| POST | `/ai/summarize-feedback` | Summarize customer feedback **(admin)** |
| POST | `/newsletter/subscribe` | Newsletter opt-in (public) |
| GET · POST | `/discounts` | List / create discounts **(admin)** |
| PATCH · DELETE | `/discounts/{id}` | Update/remove a discount **(admin)** |
| GET | `/marketing/opted-in-count` | Count of marketing-opted-in users **(admin)** |
| POST | `/marketing/send` | Send a marketing email via Resend **(admin)** |

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon/public key — used for Supabase Auth flows |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only, bypasses RLS |
| `SUPABASE_JWT_SECRET` | JWT signing secret (present for reference; token verification currently delegates to Supabase rather than decoding locally) |
| `FRONTEND_ORIGIN` | Allowed CORS origin — the frontend's URL (default `http://localhost:3000`) |
| `GEMINI_API_KEY` | Google AI Studio key powering the AI Assistant. Unset → assistant falls back to a keyword-matched answer instead of erroring |
| `GEMINI_MODEL` | Gemini model name (default `gemini-flash-latest`) |
| `RESEND_API_KEY` | Resend key powering marketing emails. Unset → `/api/marketing/send` returns 400 |
| `RESEND_FROM_EMAIL` | Sender address for marketing emails — must be on a domain verified in Resend for real sends |
| `SALES_MODEL_PATH` | Optional override for where the trained model is loaded from/saved to (default `app/ml/saved_models/lgb_sales_model.pkl`) |

## How to Run

```bash
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # fill in at least the SUPABASE_* keys
uvicorn app.main:app --reload --port 8000
```

Or via the included script:

```bash
./run-api.sh
```

The API comes up on `http://localhost:8000`; interactive docs are at `/docs`.

The forecasting model isn't shipped in the repo. Without one, `GET /api/sales/forecast-ml` responds with `model_available: false` rather than an error. Train one with:

```bash
python -m app.ml.train
```

or trigger it remotely once deployed via `POST /api/sales/retrain` (admin).

**Deployment**: the API is deployed on [Render](https://render.com) (`apt.txt` installs `libgomp1`, LightGBM's OpenMP runtime dependency).

**Tests**: none yet — this is an area to contribute to.
