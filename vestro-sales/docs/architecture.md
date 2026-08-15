# Vestro Architecture - Technical Deep Dive

Documentação técnica detalhada da arquitetura do Vestro Frontend. Este documento descreve as decisões de design, padrões e fluxos de dados em profundidade.

---

## 1. Visão Geral da Arquitetura

### Stack Tecnológico

```
Frontend Framework:    Next.js 16.3.1 (Turbopack bundler)
Runtime:              Node.js 18+ (ES2020+)
UI Library:           React 18.3.1
Styling:              Tailwind CSS 3.4.10 (utility-first)
Animations:           Framer Motion 11.5.4
Charts:               Recharts 2.12.7
Icons:                Lucide React 0.441.0
Language:             TypeScript 5.5.4 (strict mode)
Package Manager:      npm (lock file: package-lock.json)
```

### Padrão Arquitetural: Layered + Smart/Dumb Components

```
┌─────────────────────────────────────────┐
│        Pages (Server/Client)            │
│  (Next.js App Router)                   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│  Components │  │ Hooks/State  │
│  (UI/View)  │  │  (Logic)     │
└──────┬──────┘  └──────┬───────┘
       │                │
       └───────┬────────┘
               ▼
        ┌──────────────────┐
        │  Data Layer      │
        │  (Lib/Services)  │
        └──────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
   ┌────────┐      ┌─────────┐
   │ Types  │      │ Schemas │
   │ (Interfaces)  │ (Validation)
   └────────┘      └─────────┘
```

---

## 2. Organização de Pastas

### `src/app/` - Next.js App Router

**Estratégia de Grouping**: Agrupamento por contexto (público vs privado)

```
src/app/
├── layout.tsx                              # Root Layout
│   ├── CSS globals
│   ├── Font loading (Space Grotesk, Inter)
│   ├── Metadata
│   └── Providers (future: AuthContext, etc)
│
├── (app)/
│   │   # Grupo: Rotas compartilhadas
│   │
│   ├── (public)/                           # Rotas públicas
│   │   ├── login/
│   │   │   └── page.tsx                   # Form mock auth
│   │   ├── register/
│   │   │   └── page.tsx                   # Form cadastro
│   │   ├── data/
│   │   │   └── products.ts                # Mock data - 8 produtos
│   │   └── [futuro: forgot-password/]
│   │
│   ├── (private)/                          # Rotas protegidas (admin only)
│   │   └── admin/
│   │       ├── layout.tsx                 # Proteção + Sidebar
│   │       ├── page.tsx                   # Dashboard (metrics + chart)
│   │       ├── products/
│   │       │   └── page.tsx               # CRUD de produtos
│   │       ├── chat/                      # [futuro]
│   │       └── ai-assistant/              # [futuro]
│   │
│   ├── page.tsx                           # Landing Page (/)
│   ├── products/
│   │   ├── page.tsx                       # Catálogo completo /products
│   │   ├── [id]/
│   │   │   └── page.tsx                   # Detalhe /products/[id]
│   │   └── [futuro: search params]
│   │
│   └── [futuro: about/, contact/, etc]
│
└── api/                                    # [futuro: API routes]
    └── [routes serão adicionadas]
```

**Naming Conventions**:
- `(groupName)` = Grupo de rotas (não aparece em URL)
- `(public)` = Acesso irrestrito
- `(private)` = Requer autenticação + role específico

### `src/components/` - Componentes React

**Padrão**: Componentes `'use client'` para interatividade, estrutura em composição

```
src/components/
├── HeroSection.tsx
│   ├─ Tipo: Client Component ('use client')
│   ├─ Dependencies: motion, Link, (nenhuma lógica complexa)
│   ├─ Responsabilidade: Render hero com animations
│   └─ Reutilização: Landing page apenas
│
├── Navbar.tsx
│   ├─ Tipo: Server Component (pode ser server ou client)
│   ├─ Features: Logo, nav links, auth status badge
│   └─ Reutilização: Global (layout wrapper)
│
├── ProductCard.tsx
│   ├─ Tipo: Client Component ('use client' - motion)
│   ├─ Props: { product: Product }
│   ├─ Features:
│   │  ├─ Image com hover scale animation
│   │  ├─ Hover lift (y: -5)
│   │  ├─ Stock status badge
│   │  └─ Link para /products/[id]
│   └─ Reutilização: Landing + /products page
│
├── Reveal.tsx
│   ├─ Tipo: Client Component ('use client' - motion)
│   ├─ Padrão: Compound component (3 exports)
│   │  ├─ Reveal (wrapper único com scroll trigger)
│   │  ├─ RevealContainer (pai com stagger)
│   │  └─ RevealItem (filho com stagger)
│   ├─ Features:
│   │  ├─ whileInView={{ opacity: 1 }}
│   │  ├─ viewport={{ once: true, margin: '-100px' }}
│   │  ├─ itemVariants com staggerChildren
│   │  └─ Reutilizável em qualquer seção
│   └─ Reutilização: Featured, Testimonials, Newsletter
│
├── TrustBar.tsx
│   ├─ Tipo: Client Component ('use client' - motion)
│   ├─ Features: 3 trust items (Truck, Shield, Lock icons)
│   ├─ Animation: Entrada com delay indexado
│   └─ Reutilização: Landing page
│
├── TestimonialsSection.tsx
│   ├─ Tipo: Client Component ('use client' - motion)
│   ├─ Features:
│   │  ├─ 3 testimonials hardcoded
│   │  ├─ Star ratings (lucide Star icon)
│   │  ├─ Hover animations
│   │  └─ Reveal container wrapper
│   └─ Reutilização: Landing page
│
├── NewsletterCTA.tsx
│   ├─ Tipo: Client Component ('use client' - motion + useState)
│   ├─ Features:
│   │  ├─ Email input com validação básica
│   │  ├─ Subscribe button com loader state
│   │  ├─ Success message (3s timeout)
│   │  └─ Dark background (ink color)
│   └─ Reutilização: Landing page
│
├── SalesChart.tsx
│   ├─ Tipo: Client Component (Recharts)
│   ├─ Props: { history: SalesForecastPoint[], forecast: SalesForecastPoint[] }
│   ├─ Features:
│   │  ├─ ComposedChart (lines + bars)
│   │  ├─ 2 LineChart (actual + predicted)
│   │  ├─ Dashed stroke para predicted
│   │  ├─ Tooltip + Legend
│   │  └─ Responsive container
│   └─ Reutilização: Admin dashboard
│
└── Sidebar.tsx
    ├─ Tipo: Client Component ('use client' - router)
    ├─ Features:
    │  ├─ Navegação admin (Dashboard, Products, Chat, AI)
    │  ├─ Active state baseado em pathname
    │  ├─ Logout com cleanup localStorage
    │  └─ Lucide icons
    └─ Reutilização: Admin layout
```

**Padrões de Componentes**:

1. **Smart vs Dumb**: 
   - Dumb (presentational): `ProductCard`, `HeroSection`, `TrustBar` → Props only
   - Smart (container): `page.tsx` → Fetch data + composição

2. **Compound Components**: 
   - `Reveal` (3 variantes), `RevealContainer`, `RevealItem`
   - Permite composição flexível

3. **Client-Only Components**:
   - Sempre na pasta `components/`
   - `'use client'` directive no topo
   - Evita hydration mismatch

### `src/hooks/` - Custom React Hooks

```
src/hooks/
├── useAuthMock.ts
│   ├─ Responsabilidade: Gerenciar estado de autenticação
│   ├─ Estado:
│   │  ├─ user: AdminUser | null
│   │  ├─ isLoading: boolean
│   │  └─ isAdmin: boolean (derivado)
│   ├─ Métodos:
│   │  ├─ login(email, password): AdminUser
│   │  └─ logout(): void
│   ├─ Storage:
│   │  ├─ Key: 'vestro_auth_user'
│   │  ├─ Persiste em localStorage
│   │  └─ Restaurado ao mount
│   └─ Uso: useAuthMock() → { user, isAdmin, login, logout, isLoading }
│
├── useProducts.ts
│   ├─ Responsabilidade: Fetch + filtro de produtos
│   ├─ Estados: products[], loading, error
│   ├─ Métodos: setSearch, setCategory
│   ├─ Lógica:
│   │  ├─ Fetch inicial de getProducts()
│   │  ├─ useMemo para filtro (evita recálculo)
│   │  └─ Suporta search e category filter
│   └─ Uso: const { products, loading, search, category } = useProducts()
│
└── [futuro: useCart, useNotifications, etc]
```

### `src/lib/` - Business Logic Layer

```
src/lib/
├── product-data.ts
│   ├─ Padrão: Data Access Layer (DAL)
│   ├─ Responsabilidade: Interface de produtos
│   ├─ Exports:
│   │  ├─ getProducts(): Promise<Product[]>
│   │  ├─ getFeaturedProducts(limit?): Promise<Product[]>
│   │  ├─ getProductById(id): Promise<Product | null>
│   │  └─ getCategories(): Promise<string[]>
│   ├─ Vantagem: Abstração permite future backend swap
│   │  Antes: products = await mockProducts
│   │  Depois: products = await supabase.query('products')
│   │  (Sem mudança em components/pages)
│   └─ Dependências: mockProducts array (data/products.ts)
│
└── mock-admin.ts
    ├─ Responsabilidade: Mock data para admin features
    ├─ Exports:
    │  ├─ mockAdminUsers: AdminUser[]
    │  │  └─ email: 'admin@vestro.com', password: 'admin123'
    │  ├─ mockSalesData: SalesDataPoint[]
    │  │  ├─ 7 dias histórico (actual)
    │  │  ├─ 7 dias previsão (predicted)
    │  │  └─ Formato: { date, actual?, predicted? }
    │  └─ mockMetrics: MetricsData
    │     ├─ revenue, orders, growth, customers
    │     └─ Valores simulados
    └─ Formato date: ISO 8601 ('2026-08-14T...')
```

### `src/types/` - TypeScript Type Definitions

```
src/types/
├── product.ts
│   ├─ ProductCategory = 'accessories' | 'audio' | 'desk' | 'mobile' | 'network' | 'work'
│   ├─ Product
│   │  ├─ id: string
│   │  ├─ name: string
│   │  ├─ description: string
│   │  ├─ category: ProductCategory
│   │  ├─ price: number
│   │  ├─ stock: number
│   │  ├─ image_url: string
│   │  ├─ is_active: boolean
│   │  ├─ created_at: string (ISO 8601)
│   │  └─ updated_at: string (ISO 8601)
│   ├─ ProductCreateInput
│   │  └─ Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'>
│   │
│   └─ [futuros: Cart, Order, Review, etc]
│
└── index.ts
    └─ Barrel export: re-export tudo de product.ts
       (Permite: import type { Product } from '@/src/types')
```

### `src/schemas/` - Data Validation

```
src/schemas/
├── product.ts
│   ├─ isProduct(obj): obj is Product
│   ├─ validateProducts(objs): Product[] (throw)
│   ├─ normalizeProductCreate(input): ProductCreateInput
│   └─ Padrão: Runtime type checking (não apenas TypeScript)
│
└── index.ts
    └─ Barrel export de schemas
```

---

## 3. Fluxo de Dados

### Landing Page (/)

**Tipo de componente**: Async Server Component (sem `'use client'`)

```tsx
// src/app/(app)/page.tsx
export const revalidate = 0;  // ISR desabilitado (dynamic)

export default async function LandingPage() {
  const products = await getFeaturedProducts();
  
  return (
    <>
      <Navbar />
      <HeroSection />                          {/* Client Component */}
      <TrustBar />                             {/* Client Component */}
      
      <section id="featured">
        <RevealContainer>
          {products.map(p => 
            <RevealItem key={p.id}>
              <ProductCard product={p} />      {/* Client Component */}
            </RevealItem>
          )}
        </RevealContainer>
      </section>
      
      <TestimonialsSection />                  {/* Client Component */}
      <NewsletterCTA />                        {/* Client Component */}
      <footer />
    </>
  );
}
```

**Sequência de Renderização**:

```
1. Next.js Server (geração)
   ├─ Executa getProducts() → mockProducts[0:4]
   ├─ Renderiza JSX estático
   └─ Injecta valores em RevealContainer/RevealItem

2. Browser (hidratação + interatividade)
   ├─ Baixa bundle JS (Framer Motion, etc)
   ├─ Hidrata client components
   ├─ Ativa listeners de eventos
   ├─ whileInView observers
   └─ Scroll animations começam

3. User Interaction
   ├─ Hover no ProductCard → motion.div responde
   ├─ Scroll → Reveal animations disparam
   └─ Newsletter CTA → form submission → success message
```

### Admin Dashboard (/admin)

**Tipo de componente**: Async Server + Client Components com Proteção

```tsx
// src/app/(app)/(private)/admin/layout.tsx
'use client';

export default function AdminLayout({ children }) {
  const { user, isAdmin, isLoading } = useAuthMock();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <redirect>('/login')</redirect>;
  if (!isAdmin) return <redirect>('/products')</redirect>;
  
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(app)/(private)/admin/page.tsx
export default async function AdminDashboard() {
  const metrics = mockMetrics;
  const salesData = mockSalesData;
  
  return (
    <>
      <MetricCards data={metrics} />           {/* Server rendered */}
      <SalesChart data={salesData} />          {/* Client component */}
    </>
  );
}
```

**Fluxo de Autenticação**:

```
1. Usuário não autenticado acessa /admin
   ├─ AdminLayout.tsx monta (client)
   ├─ useAuthMock() → localStorage vazio → user = null
   ├─ Condicional: if (!user) → redirect('/login')
   └─ Navega para login page

2. Usuário faz login em /login
   ├─ Form submit
   ├─ useAuthMock().login(email, password)
   ├─ Se válido: localStorage['vestro_auth_user'] = JSON(user)
   ├─ router.push('/admin')
   └─ Page refresh

3. Usuário acessa /admin novamente
   ├─ AdminLayout monta
   ├─ useAuthMock() → localStorage.getItem() → user = AdminUser
   ├─ Condicional: if (isAdmin) → render dashboard
   └─ Exibe Sidebar + Dashboard content
```

### Produto Detail Page (/products/[id])

**[futuro implementação]**

```tsx
// Será um async server component
export default async function ProductDetailPage({ params }) {
  const product = await getProductById(params.id);
  if (!product) return <NotFound />;
  
  return (
    <>
      <ProductHero product={product} />
      <ProductGallery images={product.images} />
      <ProductDetails product={product} />
      <ReviewsSection productId={product.id} />
      <RelatedProducts category={product.category} />
    </>
  );
}
```

---

## 4. Estilos & Tailwind

### Configuração

```typescript
// tailwind.config.ts
content: [
  './src/app/**/*.{ts,tsx}',
  './src/components/**/*.{ts,tsx}',
]

theme: {
  colors: {
    ink: '#0B0D10',      // Preto corporativo
    paper: '#F6F5F2',    // Branco off (mais quente)
    accent: '#3D5AFE',   // Azul vibrante para CTAs
    muted: '#8A8F98',    // Cinza para texto secundário
  },
  fontFamily: {
    display: 'var(--font-display)',   // Space Grotesk
    body: 'var(--font-body)',         // Inter
  }
}
```

### Padrões de CSS

```tsx
// Utility classes customizadas
.container-page {
  @apply max-w-6xl mx-auto px-6;
}

// Tipografia minimalista
// h1: font-display text-5xl md:text-6xl leading-[1.05]
// p: text-base text-ink/60

// Espaçamento sistemático
// py-24 (96px vertical)
// gap-6 (24px entre items)
```

### Exemplo de Component Styled

```tsx
// ProductCard.tsx
export default function ProductCard({ product }) {
  return (
    <Link href={`/products/${product.id}`}>
      <motion.div
        className="group flex flex-col overflow-hidden rounded-2xl 
                   border border-black/5 bg-white transition"
        whileHover={{ y: -5 }}
      >
        <div className="aspect-square w-full overflow-hidden bg-ink/5">
          <motion.img
            src={product.image_url}
            whileHover={{ scale: 1.05 }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <span className="text-xs uppercase tracking-wide text-muted">
            {product.category}
          </span>
          <h3 className="font-display text-base font-semibold">
            {product.name}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}
```

---

## 5. Animações com Framer Motion

### Padrão 1: Entrance Animations (Hero)

```tsx
<motion.h1
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.2 }}
>
  Título
</motion.h1>
```

**Semântica**:
- `initial`: Estado antes da renderização
- `animate`: Estado final
- `transition.delay`: Stagger entre elementos

### Padrão 2: Scroll Reveal (Reveal.tsx)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

<motion.div
  variants={containerVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-100px' }}
>
  {items.map((item, i) => 
    <motion.div key={i} variants={itemVariants}>
      {item}
    </motion.div>
  )}
</motion.div>
```

**Semântica**:
- `whileInView`: Anima quando entra no viewport
- `viewport={{ once: true }}`: Anima apenas 1x
- `margin: '-100px'`: Trigger 100px antes de visível
- `staggerChildren: 0.1`: 100ms delay entre filhos

### Padrão 3: Hover Interactions

```tsx
<motion.div
  whileHover={{ y: -5 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  Clicável
</motion.div>
```

### Padrão 4: Conditional Animations

```tsx
{isLoading ? (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1 }}
  >
    <Spinner />
  </motion.div>
) : (
  content
)}
```

---

## 6. Autenticação (Mock-First Pattern)

### Arquitetura de Autenticação

```
┌──────────────────────────────────┐
│     Browser localStorage         │
│   Key: 'vestro_auth_user'        │
│   Value: JSON(AdminUser)         │
└──────────────┬───────────────────┘
               │
               │ useAuthMock hook (React)
               │ - Lê localStorage no mount
               │ - Persiste ao fazer login
               │ - Limpa ao fazer logout
               │
        ┌──────▼──────────┐
        │  Auth State     │
        │  ├─ user        │
        │  ├─ isAdmin     │
        │  ├─ isLoading   │
        │  └─ methods     │
        └──────┬──────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌────────────┐     ┌──────────────┐
│ Protected  │     │ Public Pages │
│ Routes     │     │              │
│ (/admin)   │     │ (/products)  │
└────────────┘     └──────────────┘
```

### MockAdminUsers

```typescript
const mockAdminUsers: AdminUser[] = [
  {
    id: 'admin-001',
    email: 'admin@vestro.com',
    password: 'admin123',
    role: 'admin',
    full_name: 'Admin Vestro',
  }
];

// Apenas 1 usuário hardcoded para MVP
// [futuro: array completo de usuários]
```

### Login Flow

```tsx
// pages/login/page.tsx
const handleSubmit = async (email, password) => {
  try {
    const user = login(email, password);  // useAuthMock
    // ✅ localStorage['vestro_auth_user'] = JSON(user)
    router.push('/admin');
  } catch (error) {
    setError('Invalid credentials');
  }
};
```

### Route Protection

```tsx
// (private)/admin/layout.tsx
'use client';

export default function AdminLayout({ children }) {
  const { user, isAdmin } = useAuthMock();
  
  // ✅ Proteção dupla: autenticação + role
  if (!user) return redirect('/login');
  if (!isAdmin) return redirect('/products');
  
  return <div>{children}</div>;
}
```

---

## 7. Mock Data Strategy

### Problema Resolvido

**MVP sem backend externo** → MockData Layer

### Implementação

```
mockProducts array (8 items)
    ↓
product-data.ts (abstração)
    ├─ getProducts()
    ├─ getFeaturedProducts(limit)
    ├─ getProductById(id)
    └─ getCategories()
    ↓
Pages/Components (não sabem se é mock ou real)
```

### Vantagem

**Zero mudanças em UI quando backend estiver pronto**:

```typescript
// Antes (mock)
export async function getProducts() {
  return mockProducts;
}

// Depois (Supabase)
export async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('*');
  return data;
}

// Components/pages → 0 mudanças ✅
```

### Mock Sales Data Structure

```typescript
type SalesDataPoint = {
  date: string;           // ISO 8601
  actual?: number;        // Histórico
  predicted?: number;     // Previsão
};

// 7 dias passado + 7 dias futuro
mockSalesData = [
  { date: '2026-08-08', actual: 1200, predicted: null },
  ...
  { date: '2026-08-14', actual: 1950, predicted: 2100 },  // Hoje
  { date: '2026-08-15', actual: null, predicted: 2200 },  // Amanhã
  ...
]
```

---

## 8. Build & Deployment

### Build Process

```bash
npm run build
```

**Steps**:

1. **Turbopack Compilation**
   - Compila TypeScript → JavaScript
   - Tree-shaking de imports não usados
   - Code splitting automático

2. **Route Generation**
   - Coleta todas as pages
   - Gera lista de rotas

3. **Static Optimization**
   - Pré-renderiza pages estáticas
   - Gera index HTML

4. **Output**
   ```
   .next/
   ├── .next/static/     # JS/CSS bundles
   ├── .next/server/     # SSR functions
   └── .next/cache/      # ISR cache
   ```

### Production Build Routes

```
Route (app)
├─ / (Dynamic - server-rendered)
├─ /_not-found (Static)
├─ /admin (Dynamic - server-rendered)
├─ /admin/products (Dynamic - server-rendered)
├─ /login (Dynamic - server-rendered)
├─ /products (Dynamic - server-rendered)
└─ /register (Dynamic - server-rendered)
```

**Nota**: Todas as rotas são dinâmicas porque usam `export const revalidate = 0`

---

## 9. Performance Considerations

### Lazy Loading

```typescript
// [futuro] Dynamic imports para components pesados
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <LoadingSpinner />,
});
```

### Image Optimization

```tsx
// Usar Next.js Image component
// [futuro implementação]
import Image from 'next/image';

<Image
  src={product.image_url}
  alt={product.name}
  width={500}
  height={500}
  priority={false}
  placeholder="blur"
/>
```

### Bundle Size Analysis

```bash
# [futuro] Verificar tamanho de bundles
npm run analyze
```

---

## 10. Roadmap de Desenvolvimento

### MVP 1 ✅ (Atual)
- Landing page com animações
- Mock auth + admin dashboard
- 8 produtos mock
- Gráfico de vendas

### MVP 2 (Próximo)
- [ ] Product listing com filtros
- [ ] Product detail page com reviews
- [ ] Carrinho de compras (localStorage)
- [ ] Checkout flow (mock)
- [ ] Order history

### MVP 3 (Backend Integration)
- [ ] Migrar para Supabase
- [ ] Real email newsletter
- [ ] Admin product CRUD real
- [ ] Inventory management
- [ ] Real sales data

### Future Phases
- [ ] AI assistant (chat)
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] SMS support
- [ ] Mobile app (React Native)

---

## 11. Troubleshooting

### Erro: "Element type is invalid... undefined"

**Causa**: Esqueceu `'use client'` em componente com Framer Motion

**Solução**:
```tsx
'use client';  // ← Adicione no topo
import { motion } from 'framer-motion';
```

### Erro: "revalidate() from server but revalidate is on client"

**Causa**: Page é async server component com `'use client'`

**Solução**: Remova `'use client'` ou use `export const revalidate = 0` em server component

### Tailwind não aplica estilos

**Causa**: tailwind.config.ts content paths incorretos

**Verificar**:
```typescript
content: [
  './src/app/**/*.{ts,tsx}',    // ← Correto
  './src/components/**/*.{ts,tsx}',  // ← Correto
]

// ❌ Errado
// content: ['./app/**', './components/**']  // Sem src/
```

### Hydration mismatch

**Causa**: Diferença entre server render e client render

**Solução**: Use `useEffect` para estado que só existe em cliente

```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;  // ← Evita hydration mismatch
```

---

## 12. Conventions & Best Practices

### ✅ Do's

- ✅ Coloque `'use client'` em componentes com hooks
- ✅ Use path aliases (`@/src/`) em imports
- ✅ Exporte tipos em `types/index.ts`
- ✅ Use `motion` do `framer-motion` para animações
- ✅ Componentes dumb receivem props, não fazem fetches
- ✅ Use `await` para async components
- ✅ Teste tipos com `npx tsc --noEmit`

### ❌ Don'ts

- ❌ Não misture `'use client'` com `export const revalidate`
- ❌ Não faça imports relativos (`../../../`) - use aliases
- ❌ Não deixe `console.log` em produção
- ❌ Não coloque lógica complexa direto em page components
- ❌ Não use componentes client dentro de server components sem `dynamic`

---

## 13. Referências & Recursos

### Documentação Oficial
- [Next.js 16 App Router](https://nextjs.org/docs/app)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Reference](https://tailwindcss.com/docs)
- [React Hooks API](https://react.dev/reference/react/hooks)
- [Recharts Documentation](https://recharts.org/)

### Padrões de Código
- [Component Composition Patterns](https://www.patterns.dev/)
- [React Compound Components](https://www.smashingmagazine.com/2021/08/compound-components-react/)

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Tips](https://nextjs.org/learn/foundations/how-nextjs-works/rendering)

---

**Última Atualização**: 14 de Agosto de 2026  
**Versão**: 1.0.0-mvp1  
**Autor**: Vestro Dev Team
