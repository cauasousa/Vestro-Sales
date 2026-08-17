# vestro-sales — Vestro Sales Frontend

Next.js frontend for [Vestro Sales](../README.md): a public storefront plus a role-gated admin dashboard for products, orders, sales forecasting, planning, support chat, and the AI assistant.

## Overview

Built with Next.js 16 (App Router, Turbopack), React 18, and TypeScript. Styling is Tailwind CSS with a custom palette and Space Grotesk/Inter type pairing; Framer Motion handles micro-interactions and Recharts renders the sales/forecast charts. All data — auth, products, orders, forecasts, chat, AI assistant — comes from the [`api-vestro`](../api-vestro) backend over a typed fetch client (`src/lib/api.ts`); nothing here is mocked.

Authentication is custom (not Supabase Auth UI): `useAuth()` calls the backend's `/api/auth/*` endpoints directly and stores the session token via `src/lib/session.ts`, while a separate Supabase client (`src/lib/supabase-client.ts`) stays session-synced for Supabase-backed features like realtime chat.

## UI/UX Features

**Storefront (public)**
- Landing page, product catalog with search/filtering, product detail pages
- Cart, checkout, and order confirmation
- Order history
- Customer support chat

**Admin dashboard** (role-gated, redirects non-admins)
- **Dashboard** — business metrics plus live and ML-forecasted sales charts
- **Products** — catalog CRUD
- **Orders** — order management
- **Users** — user administration
- **Planning** — calendar-based discount and event planning that directly feeds the ML forecast's context features
- **Support Chat** — admin side of the customer chat inbox
- **AI Assistant** — chat interface over the backend's Gemini-powered assistant, with suggested prompts ("What's this week's revenue?", "top product", "low stock", "new customers")

## Main Components

- `src/app/(app)/(public)/` — storefront routes: landing, `products`, `products/[id]`, `cart`, `checkout`, `checkout/success`, `orders`, `support`
- `src/app/(app)/(private)/admin/` — admin routes: dashboard, `products`, `orders`, `users`, `planning`, `chat`, `ai-assistant`, plus `layout.tsx` for the auth guard and sidebar
- `src/components/` — `ForecastChart`, `CurrentSalesChart`, `ProductCard`, `Sidebar`, `Navbar`, `HeroSection`, `AddToCartPanel`, `Modal`, `PromotionsCalendar`, and marketing sections (`TrustBar`, `TestimonialsSection`, `NewsletterCTA`)
- `src/hooks/` — `useAuth`, `useCart`, `useProducts`
- `src/lib/` — `api.ts` (backend client), `supabase-client.ts`, `session.ts` (token storage)

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the `api-vestro` backend (defaults to `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## How to Run

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to your running backend
npm run dev
```

The app comes up on `http://localhost:3000` and expects the [backend](../api-vestro) running (locally or deployed) at `NEXT_PUBLIC_API_URL`.

Other scripts: `npm run build`, `npm run start` (production), `npm run lint`.

**Tests**: none yet — this is an area to contribute to.
