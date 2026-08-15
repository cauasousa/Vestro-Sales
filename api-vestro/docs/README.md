# Vestro - Tech Store Frontend

Um e-commerce minimalista de acessórios tech construído com **Next.js 16** (Turbopack), **Tailwind CSS 3.4** e **Framer Motion** para animações fluidas e profissionais. A arquitetura utiliza dados mock para MVP sem dependência de backend externo.

**Status**: MVP 1 - Landing Page com animações profissionais ✅

---

## 🚀 Quick Start

### Pré-requisitos
- **Node.js** 18+ (recomendado 20+)
- **npm** ou **yarn**

### Instalação

```bash
# Clonar e navegar para o diretório
cd c:\Users\CauaS\programacao\project_sales

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Acessar em http://localhost:3000
```

### Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de dev (Turbopack)
npm run build    # Produção build otimizado
npm run start    # Inicia servidor de produção
npm run lint     # Verifica código com ESLint
```

---

## 📁 Estrutura do Projeto

```
src/
├── app/                                # Next.js App Router
│   ├── (app)/                         # Grupo de rotas privadas/públicas
│   │   ├── (public)/
│   │   │   ├── data/
│   │   │   │   └── products.ts       # Mock de 8 produtos
│   │   │   └── login/
│   │   │       └── page.tsx          # Página de login
│   │   ├── (private)/
│   │   │   └── admin/
│   │   │       ├── layout.tsx        # Layout + proteção de rota
│   │   │       ├── page.tsx          # Dashboard com gráfico de vendas
│   │   │       └── products/
│   │   │           └── page.tsx      # Gestão de produtos
│   │   ├── page.tsx                  # Landing page com todas as seções
│   │   ├── products/
│   │   │   ├── page.tsx              # Catálogo completo
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Detalhe do produto
│   │   └── register/
│   │       └── page.tsx              # Página de cadastro
│   └── layout.tsx                    # Root layout com fontes e configuração global
│
├── components/                        # Componentes React reutilizáveis (client)
│   ├── HeroSection.tsx               # Hero com animações staggered fade-up
│   ├── Navbar.tsx                    # Navegação superior
│   ├── ProductCard.tsx               # Card de produto com hover animations
│   ├── Reveal.tsx                    # Componente de scroll reveal reutilizável
│   ├── TrustBar.tsx                  # Barra de confiança (shipping, warranty, security)
│   ├── TestimonialsSection.tsx       # Seção de depoimentos com stars
│   ├── NewsletterCTA.tsx             # Call-to-action para newsletter
│   ├── SalesChart.tsx                # Gráfico de vendas com Recharts
│   └── Sidebar.tsx                   # Sidebar de admin
│
├── hooks/                            # Custom React hooks
│   ├── useAuthMock.ts                # Mock auth com localStorage
│   ├── useProducts.ts                # Fetch e filtro de produtos
│   └── [outros hooks futuros]
│
├── lib/                              # Lógica de negócio e utilitários
│   ├── product-data.ts               # Data access layer (mock)
│   ├── mock-admin.ts                 # Mock admin users e sales data
│   └── [utils futuros]
│
├── schemas/                          # Validação de dados
│   ├── product.ts                    # Validadores de Product
│   └── [schemas futuros]
│
└── types/                            # TypeScript types e interfaces
    ├── product.ts                    # Product, ProductCategory tipos
    └── index.ts                      # Barrel exports

public/                               # Assets estáticos
docs/                                 # Documentação
└── README.md (este arquivo)
└── architecture.md
```

---

## 🎨 Design & Animações

### Paleta de Cores (Tailwind)
```
ink (#0B0D10)      - Preto/Escuro (texto, backgrounds)
paper (#F6F5F2)    - Branco/Creme (backgrounds claros)
accent (#3D5AFE)   - Azul (CTAs, destaque)
muted (#8A8F98)    - Cinza (texto secundário)
```

### Tipografia
- **Display** (títulos): Space Grotesk 600 (semibold)
- **Body** (texto): Inter 400-500

### Animações Implementadas

#### Hero Section
- Badge: fade-up com scale (0.1s delay)
- Título: fade-up (0.2s delay)
- Descrição: fade-up (0.3s delay)
- Botões: fade-up + hover scale (0.4s delay)

```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, delay: X }}
```

#### Product Cards
- Hover lift: `whileHover={{ y: -5 }}`
- Image scale: `whileHover={{ scale: 1.05 }}`
- Spring transitions: `type: 'spring', stiffness: 300`

#### Scroll Reveals
- Containers com `whileInView={{ opacity: 1 }}`
- Staggered children: `containerVariants: { staggerChildren: 0.1 }`
- Viewport margin: `-100px` (trigger antes de visibilidade total)

#### Trust Bar
- Cada item entra com delay: `delay={index * 0.1}`

#### Testimonials
- Cards com hover lift: `whileHover={{ y: -4 }}`
- Entrada escalonada com Reveal

---

## 🔐 Autenticação (Mock-First)

### Sistema de Login
Implementado com **localStorage** para MVP sem backend:

```typescript
// admin@vestro.com / admin123
const mockAdminUsers = [
  {
    id: 'admin-001',
    email: 'admin@vestro.com',
    password: 'admin123',
    role: 'admin',
    full_name: 'Admin Vestro',
  }
];
```

### Hook `useAuthMock()`
```tsx
const { user, isAdmin, isLoading, login, logout } = useAuthMock();

// Armazena em localStorage['vestro_auth_user']
// Restaura estado ao recarregar página
```

### Proteção de Rotas
```tsx
// (private)/admin/layout.tsx
if (!user) router.push('/login');
if (!isAdmin) router.push('/products');
```

---

## 📦 Dados de Produtos (Mock)

**Arquivo**: `src/app/(app)/(public)/data/products.ts`

**8 Produtos Pré-configurados:**

| ID | Nome | Categoria | Preço | Stock | Imagem |
|----|------|-----------|-------|-------|--------|
| keyboard-01 | Compact Mechanical Keyboard | accessories | $89.90 | 18 | Pexels |
| combo-01 | Keyboard and Mouse Set | desk | $129.90 | 12 | iStock |
| mouse-01 | Yellow Wireless Mouse | work | $34.90 | 26 | iStock |
| phone-01 | Mobile Phone Stand | mobile | $24.90 | 40 | Pexels |
| router-01 | Wi-Fi Router Pro | network | $149.90 | 9 | iStock |
| case-01 | Protective Phone Case | mobile | $19.90 | 54 | Pexels |
| motherboard-01 | ATX Motherboard | work | $189.90 | 7 | Pexels |
| cpu-01 | Core i5 Processor | work | $219.90 | 5 | Pexels |

**Categorias**: `accessories | audio | desk | mobile | network | work`

### Data Access Layer
```typescript
// src/lib/product-data.ts
await getProducts()              // Retorna todos os 8
await getFeaturedProducts(4)     // Retorna 4 primeiros (padrão)
await getProductById('id')       // Busca por ID
await getCategories()            // Array único de categorias
```

---

## 📊 Dashboard Admin

**Rota**: `/admin` (requer login)

### Recursos Implementados
- ✅ Cards de métricas (Revenue, Orders, Growth)
- ✅ Gráfico de vendas (Recharts)
  - 7 dias histórico (actual sales)
  - 7 dias previsão (predicted sales)
  - Linhas sólidas vs tracejadas
  - Tooltip interativo
- ✅ Sidebar navegável
- ✅ Logout com localStorage cleanup

### Mock Sales Data
```typescript
// src/lib/mock-admin.ts
mockSalesData = [
  { date: '2026-08-08', actual: 1200, predicted: null },
  { date: '2026-08-14', actual: 1950, predicted: 2100 },
  { date: '2026-08-15', actual: null, predicted: 2200 }, // futuro
  ...
]
```

---

## 🛠️ Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| **next** | ^16.3.1 | Framework React com Turbopack |
| **react** | ^18.3.1 | Biblioteca UI |
| **framer-motion** | ^11.5.4 | Animações suaves |
| **tailwindcss** | ^3.4.10 | Styling utility-first |
| **lucide-react** | ^0.441.0 | Ícones SVG |
| **recharts** | ^2.12.7 | Gráficos |
| TypeScript | ^5.5.4 | Type safety |

---

## 🎯 Seções da Landing Page

### 1. **Hero Section** (`HeroSection.tsx`)
- Badge "New arrivals every month"
- Título: "Home gear for people who care about the details."
- Descrição minimalista
- 2 CTAs: "Browse the shop" + "See what's new"
- Todas com staggered entrance animations

### 2. **Trust Bar** (`TrustBar.tsx`)
Três sinais de confiança:
- 🚚 Free shipping
- 🛡️ 1-year warranty
- 🔒 Secure checkout

### 3. **Featured Products** (`page.tsx`)
- Grid responsivo: 2 colunas (mobile) → 4 colunas (desktop)
- Cascading Reveal animations com index delays
- ProductCard com hover effects

### 4. **Testimonials** (`TestimonialsSection.tsx`)
- 3 depoimentos com ⭐⭐⭐⭐⭐ (5 stars)
- Hover lift animations
- Entrada escalonada

### 5. **Newsletter CTA** (`NewsletterCTA.tsx`)
- Background ink (escuro)
- Email input com validação
- Subscribe button animado
- Feedback "Thanks for subscribing!" (3s)

### 6. **Footer**
- Copyright e crédito

---

## 🔄 Fluxo de Dados

```
Landing Page (async server component)
├─ Navbar (static)
├─ HeroSection (client - motion)
├─ TrustBar (client - motion)
├─ Featured Products Section
│  ├─ getFeaturedProducts() → product-data.ts
│  ├─ mockProducts array
│  └─ ProductCard[] (client - motion)
├─ TestimonialsSection (client - motion)
├─ NewsletterCTA (client - motion + state)
└─ Footer (static)

Admin Dashboard (protected route)
├─ Layout (checks auth via useAuthMock)
├─ Metrics (mock data from mock-admin.ts)
├─ SalesChart (Recharts + mockSalesData)
└─ Sidebar (navigation + logout)
```

---

## 🚦 Status das Funcionalidades

### MVP 1 ✅ Completo
- ✅ Landing page com animações profissionais
- ✅ Hero, Trust Bar, Featured Products, Testimonials, Newsletter
- ✅ Mock authentication (localStorage)
- ✅ Admin dashboard com gráfico de vendas
- ✅ 8 produtos em mock data
- ✅ Build production otimizado
- ✅ TypeScript type-safe

### Próximas Fases (Roadmap)
- 🟡 Products page com filtros avançados
- 🟡 Product detail page com reviews
- 🟡 Carrinho de compras (estado local)
- 🟡 Backend Supabase integration
- 🟡 Real email newsletter integration
- 🟡 AI assistant para chat (admin)
- 🟡 Gestão de inventário real (admin)

---

## 🧪 Testing & Build

```bash
# Verificar tipos TypeScript
npx tsc --noEmit

# Build de produção
npm run build
# → Gera `.next/` otimizado
# → Routes pré-renderizadas: /, /admin, /admin/products, /login, /products, /register

# Iniciar servidor de produção
npm run start
```

---

## 📝 Convenções de Código

### Client Components
Todos os componentes com Framer Motion **DEVEM** ter `'use client'`:
```tsx
'use client';
import { motion } from 'framer-motion';
```

### Server Components
Landing page é **async server component** (sem `'use client'`):
```tsx
// página/layout default
export default async function LandingPage() {
  const products = await getFeaturedProducts();
}
```

### Imports
- Path aliases: `@/src/` ao invés de `../../../`
- Barrel exports em `types/index.ts` e `schemas/index.ts`

### Tailwind Utilities
```
container-page    → max-w-6xl mx-auto px-6
py-24            → padding vertical 96px
gap-6            → espaçamento entre flex items
rounded-full     → border-radius 9999px
```

---

## 🔗 Recursos Úteis

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org/en-US/)

---

## 📧 Contato & Suporte

Este é um projeto portfolio. Para dúvidas sobre a arquitetura, abra uma issue ou revise `docs/architecture.md`.

**Último Update**: 14 de Agosto de 2026
**Versão**: 1.0.0-mvp1
