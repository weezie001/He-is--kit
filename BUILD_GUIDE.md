# HEIS KITS — Full Build Guide

> An AI-powered football (soccer) apparel store. This document walks the entire build from the first sketch to production deployment. Each phase has a **goal**, **steps**, and a **done-when** checklist.

**Stack at a glance:** React 19 + Vite + Tailwind + shadcn/ui (frontend) · Express + tRPC (API) · Drizzle ORM + MySQL (data) · OAuth (auth) · LLM-backed AI features.

---

## Phase 0 — The Sketch (concept on paper)

**Goal:** Know what you're building before writing a line of code.

1. **One-sentence pitch.** _"Premium football kits and training wear, with AI that helps fans find the right kit, size, and style."_ → Tagline: **"For the Love of the Game."**
2. **Pencil the screens.** On paper or Figma/Excalidraw, rough out boxes for: Home, Catalog, Product Detail, Cart, Checkout, Profile Quiz, Search, Chatbot, Size Advisor.
3. **List the "jobs to be done":**
   - Browse and buy kits / training tops / casual wear.
   - Get a size recommendation without a tape measure.
   - Search in plain language ("retro away kit in blue").
   - Ask football questions and get product suggestions.
4. **Define the brand:** colors (black / white / cyan accent), bold "font-black" headlines, hero image, energetic tone.

**Done when:** you can describe every screen and the primary action on it in one line.

---

## Phase 1 — Discovery & Requirements

**Goal:** Turn the sketch into a concrete, testable spec.

1. **Personas:** the *Fan* (wants their club's kit), the *Player* (wants performance training wear), the *Gifter* (needs sizing help).
2. **Feature list → MoSCoW** (Must / Should / Could / Won't):
   - **Must:** catalog, product detail, cart, checkout, auth.
   - **Should:** size advisor, conversational search.
   - **Could:** chatbot, profile quiz, recommendations.
   - **Won't (v1):** returns portal, loyalty points, multi-currency.
3. **Non-functionals:** mobile-first, fast first paint, accessible (keyboard + screen reader), secure auth & payments.
4. **Success metrics:** add-to-cart rate, checkout completion, AI feature engagement.

**Done when:** every "Must" feature maps to a screen and a data requirement.

---

## Phase 2 — Information Architecture & User Flows

**Goal:** Map how a user moves through the app.

### Site map
```
/                 Home (hero + AI feature highlights + featured products)
/catalog          Product grid (filter: category, team, style)
/product/:id      Product detail (images, size selector, add to cart)
/cart             Cart review
/checkout         Order summary + payment
/profile          Sport profiler quiz + saved preferences
/search           Conversational / natural-language search
/chat             Football expert chatbot
/size-advisor     Height/weight → size recommendation
/login            OAuth sign-in
*                 Not found
```

### Core user flow — "Browse to buy"
```
Home → Catalog → Product Detail → (pick size) → Add to Cart
     → Cart → Checkout → Sign in (if needed) → Place order → Confirmation
```

### AI-assisted flows
- **Unsure of size:** Product Detail → Size Advisor → recommended size → back to Add to Cart.
- **Doesn't know what to search:** Search (types plain language) → LLM ranks products → click result.
- **Wants guidance:** Chat → asks question → bot suggests products → link to Product Detail.

**Done when:** you can trace every "Must" feature as a clickable path with no dead ends.

---

## Phase 3 — Wireframes & Visual Design

**Goal:** Lock layout and design system before building.

1. **Low-fi wireframes** for each screen (grey boxes, no color). Validate the flow.
2. **Design tokens:** colors, spacing scale, type scale, radii. (Tailwind config + CSS variables.)
3. **Component inventory:** Button, Card, ProductCard, SizeSelector, CartSummary, ChatBubble, SearchBar, Nav, Footer.
4. **High-fi mockups** of Home, Catalog, Product Detail (the three highest-traffic screens).
5. **Responsive rules:** define mobile (1 col), tablet (2 col), desktop (3–4 col) for the product grid.

**Done when:** a developer could build each screen from the mockup without guessing.

---

## Phase 4 — Tech Stack & Architecture Decisions

**Goal:** Choose tools and explain why.

| Layer | Choice | Why |
|---|---|---|
| UI framework | **React 19 + Vite** | Fast dev server, modern React features |
| Styling | **Tailwind CSS + shadcn/ui (Radix)** | Accessible primitives, rapid styling |
| Routing | **wouter** | Tiny client-side router |
| API | **tRPC** | End-to-end typesafe calls, no manual REST contracts |
| Server | **Express** | Mature Node HTTP server hosting tRPC + static |
| Data | **Drizzle ORM + MySQL** | Typed schema, SQL migrations |
| Data fetching | **TanStack Query** (via tRPC) | Caching, loading states |
| Auth | **OAuth + JWT cookie** | Delegated login, stateless sessions |
| AI | **LLM API** (server-side) | Search ranking, chatbot, size advice |
| Validation | **Zod** | Shared input schemas |

**Architecture:** the **same Express server** serves the Vite app in dev and static build in prod, and exposes the API at `/api/trpc`. One process, one deploy.

**Done when:** every stack choice has a one-line justification and the team agrees.

---

## Phase 5 — Project Scaffolding

**Goal:** A running empty app.

1. **Init repo + package manager** (this project uses `pnpm`):
   ```bash
   corepack enable
   pnpm install
   ```
2. **Folder layout:**
   ```
   client/          React app (src/pages, src/components, src/lib)
   server/          Express + tRPC routers, db queries
   server/_core/    Server bootstrap, vite glue, auth, env
   shared/          Types + constants shared by client & server
   drizzle/         Schema + SQL migrations
   scripts/         Seed + tooling
   ```
3. **Env file** (`.env`) — see Phase 11:
   ```
   DATABASE_URL=mysql://user:pass@host:3306/heiskits
   JWT_SECRET=...
   OAUTH_SERVER_URL=...
   BUILT_IN_FORGE_API_URL=...
   BUILT_IN_FORGE_API_KEY=...
   ```
4. **Run the dev server** (one process serves UI + API):
   ```bash
   pnpm dev      # http://localhost:3000 (auto-picks a free port)
   ```

**Done when:** `pnpm dev` serves a blank styled page with no console errors.

---

## Phase 6 — Data Model (the database)

**Goal:** Schema that supports every flow.

1. **Tables** (defined in `drizzle/schema.ts`):
   - `users` — openId, name, email, role, lastSignedIn
   - `products` — name, category, team, style, price, images, sizes
   - `cartItems` — userId, productId, size, quantity
   - `orders` — userId, orderNumber, totals, status, shipping
   - `chatMessages` — userId, role, content (chatbot history)
   - `searchHistory` — userId, query, results, clicked (improves search)
2. **Relationships:** user → cartItems, user → orders, product ← cartItems.
3. **Generate + run migrations:**
   ```bash
   pnpm db:push      # drizzle-kit generate && migrate
   ```
4. **Seed sample data:**
   ```bash
   node scripts/seed-products.mjs
   ```

**Done when:** the DB has tables and a handful of products to browse.

---

## Phase 7 — Backend (API layer)

**Goal:** Typed endpoints for every screen.

1. **tRPC routers** (`server/routers.ts`) grouped by domain:
   - `products` → `list`, `featured`, `byId`
   - `cart` → `get`, `add`, `remove`, `clear`
   - `orders` → `create`, `listMine`
   - `ai` → `search`, `chat`, `sizeAdvice`, `profile`
2. **Query functions** (`server/db.ts`) wrap Drizzle calls. Note: they're **lazy** — the app boots even without a DB (returns empty lists), which is great for previews.
3. **Validation:** every mutation input is a Zod schema (shared in `shared/`).
4. **Context:** `createContext` attaches the signed-in user (from the JWT cookie) to each request.

**Done when:** you can call each procedure from the tRPC client and get typed data back.

---

## Phase 8 — Frontend (build the screens)

**Goal:** Wire pages to the API.

1. **App shell:** Nav + Footer + route table (wouter) in `client/src/`.
2. **Pages** (`client/src/pages/`): build in flow order — Home → Catalog → ProductDetail → Cart → Checkout → Profile → Search → Chat → SizeAdvisor.
3. **Components** (`client/src/components/`): ProductCard, SizeSelector, CartSummary, ChatInterface, SearchBar — composed from shadcn/ui primitives in `components/ui/`.
4. **Data fetching:** use the tRPC React hooks (`trpc.products.list.useQuery(...)`) for loading/error/caching for free.
5. **State:** cart and auth via React context (`client/src/contexts/`).
6. **Responsive + dark mode pass** once layouts are correct.

**Done when:** every screen renders real data and the browse-to-buy flow works end to end.

---

## Phase 9 — AI Features

**Goal:** The differentiators. All LLM calls happen **server-side** (keys never reach the browser).

1. **Conversational Search:** user's plain-language query → LLM re-ranks/filters products → return ordered IDs. Log to `searchHistory`.
2. **Size Advisor:** height + weight (+ fit preference) → LLM/rules → recommended size with a confidence note.
3. **Expert Chatbot:** football Q&A; system prompt grounds it in the catalog so it can suggest products. Persist turns to `chatMessages`.
4. **Smart Profiler:** quiz answers → preference profile → personalized featured products.
5. **Guardrails:** timeouts, fallback to keyword search if the LLM fails, and never block checkout on an AI call.

**Done when:** each AI feature returns a useful result and degrades gracefully when the LLM is unavailable.

---

## Phase 10 — Auth & Checkout

**Goal:** Let users sign in and pay.

1. **OAuth login** (`server/_core/oauth.ts`): redirect → callback → upsert user → set signed JWT cookie.
2. **Protected actions:** cart and checkout require a session; guests can browse.
3. **Checkout flow:** cart → order summary → collect shipping → create order (`orders`) → clear cart → confirmation.
4. **Payments:** integrate a provider (e.g. Stripe) on the server; never trust client-sent prices — recompute totals server-side.

**Done when:** a signed-in user can place an order and see a confirmation with an order number.

---

## Phase 11 — Configuration & Secrets

**Goal:** Nothing hardcoded; everything via env.

- `DATABASE_URL` — MySQL connection
- `JWT_SECRET` — cookie signing
- `OAUTH_SERVER_URL`, `OWNER_OPEN_ID` — auth
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` — LLM + image gen
- `VITE_APP_ID` — client app id

Keep `.env` out of git; provide `.env.example` with blank values.

**Done when:** the app reads all secrets from env and `.env.example` documents them.

---

## Phase 12 — Testing & QA

**Goal:** Confidence the flows work.

1. **Unit tests** (Vitest) for backend procedures — products, cart, checkout, auth/logout. (Already present: `server/*.test.ts`.)
   ```bash
   pnpm test
   ```
2. **Integration tests** for AI procedures (mock the LLM).
3. **End-to-end checkout** test covering the full purchase path.
4. **Type + lint gate:**
   ```bash
   pnpm check        # tsc --noEmit
   pnpm format       # prettier
   ```
5. **Manual QA pass:** mobile, keyboard nav, empty states, error states, slow network.

**Done when:** `pnpm test` and `pnpm check` are green and the manual checklist passes.

---

## Phase 13 — Build & Deployment

**Goal:** Ship it.

1. **Production build:**
   ```bash
   pnpm build        # vite build + esbuild bundles the server
   ```
2. **Provision:** a Node host (Render/Railway/Fly/VPS) + a managed MySQL database.
3. **Set env vars** on the host (Phase 11 list). Run migrations against the prod DB:
   ```bash
   pnpm db:push
   node scripts/seed-products.mjs    # optional: seed catalog
   ```
4. **Start in production:**
   ```bash
   pnpm start        # NODE_ENV=production node dist/index.js
   ```
5. **Domain + HTTPS:** point DNS, enable TLS, set the OAuth callback URL to the live domain.
6. **Smoke test prod:** load home, browse catalog, add to cart, complete a test order, try each AI feature.

**Done when:** the live URL serves the app, a real order completes, and AI features respond.

---

## Phase 14 — Post-Launch

**Goal:** Keep it healthy and improve.

1. **Monitoring:** uptime checks, server logs, error tracking (e.g. Sentry).
2. **Analytics:** funnel from view → add-to-cart → checkout; AI feature usage.
3. **Iterate:** use `searchHistory` + chat logs to improve AI prompts and ranking.
4. **Backlog (the v1 "Won't"):** returns portal, loyalty, multi-currency, more teams/products.

**Done when:** you have dashboards for uptime, errors, and the purchase funnel.

---

## Quick Command Reference

```bash
pnpm install        # install dependencies
pnpm dev            # run dev server (UI + API on one port)
pnpm db:push        # generate + run DB migrations
node scripts/seed-products.mjs   # seed sample products
pnpm test           # run unit tests
pnpm check          # typecheck
pnpm build          # production build
pnpm start          # run production server
```

## Build Order Cheat-Sheet (TL;DR)

1. Sketch screens + pitch →
2. Lock requirements (MoSCoW) →
3. Map site + user flows →
4. Wireframe + design tokens →
5. Pick stack →
6. Scaffold repo + `pnpm dev` →
7. Define DB schema + migrate →
8. Build tRPC API →
9. Build pages in flow order →
10. Layer in AI features →
11. Add auth + checkout →
12. Wire env/secrets →
13. Test (unit + e2e + manual) →
14. Build + deploy + smoke test →
15. Monitor + iterate.
