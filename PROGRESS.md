# HEIS KITS — Build Checklist & Progress Tracker

> Companion to [BUILD_GUIDE.md](BUILD_GUIDE.md). Check items off as you go.
> Status legend: ✅ done · 🟡 in progress · ⬜ not started · 🚫 blocked

**Overall progress:** Phases 0–10 largely built. Remaining: catalog data + deployment.

---

## Phase 0 — The Sketch
- [x] One-line pitch + tagline ("For the Love of the Game")
- [x] Rough screen list (Home, Catalog, Detail, Cart, Checkout, Profile, Search, Chat, Size Advisor)
- [x] Brand direction (black / white / cyan)

## Phase 1 — Discovery & Requirements
- [x] Personas (Fan / Player / Gifter)
- [x] Feature list (MoSCoW)
- [x] Success metrics defined

## Phase 2 — IA & User Flows
- [x] Site map / route table
- [x] Core browse-to-buy flow
- [x] AI-assisted flows

## Phase 3 — Wireframes & Design
- [x] Design tokens (Tailwind + CSS vars)
- [x] Component inventory
- [x] Responsive rules
- [x] **UI REDESIGN — Bold Sport / Hype (Nike SNKRS) direction** ✅
  - Fonts: Anton (display) + Archivo (body) · Palette: white/black + blaze `#ff2e1f`
  - Reusable kit: `index.css` utilities (.display/.btn/.tag/.field…) + `components/tech`, `Layout`, `ProductCard`
  - Restyled: Home, Catalog, ProductDetail, Cart, Checkout, Search, SizeAdvisor, Chat, Profile, NotFound, VirtualTryOn
  - New: Login/Signup (`/login`, `/signup`) wired to OAuth
  - Admin panel: deferred (per scope decision)

## Phase 4 — Tech Stack
- [x] Stack chosen (React 19 / Vite / tRPC / Drizzle / MySQL)
- [x] Single-process architecture (Express serves UI + API)

## Phase 5 — Scaffolding
- [x] Repo + folder layout
- [x] `pnpm install` works
- [x] `pnpm dev` serves the app
- [ ] `.env.example` documenting required vars

## Phase 6 — Data Model
- [x] Schema defined (`drizzle/schema.ts`: users, products, cartItems, orders, chatMessages, searchHistory)
- [x] Migrations generated (`drizzle/*.sql`)
- [x] **Database provisioned & migrated** ✅ (Aiven MySQL 8.4, all 6 tables created)
- [x] **Sample products seeded** ✅ (10 products live)

## Phase 7 — Backend (API)
- [x] tRPC routers (products / cart / orders / ai)
- [x] Lazy Drizzle query layer (boots without DB)
- [x] Zod input validation
- [x] Request context with signed-in user

## Phase 8 — Frontend
- [x] App shell (Nav + Footer + routes)
- [x] All pages built
- [x] Components built
- [x] tRPC data hooks wired
- [x] Catalog renders real data ✅ (verified: 10 products + featured grid)

## Phase 9 — AI Features
- [x] Conversational Search
- [x] Size Advisor
- [x] Expert Chatbot
- [x] Smart Profiler
- [x] **Image Search** (upload photo → Gemini vision → catalog match) ✅ **live-tested, working** (free tier)
- [x] **Virtual Try-On** (upload photo → garment composited on body, multi-angle) — built & verified; ⚠️ needs Gemini **billing enabled** (image gen = 0 on free tier)
- [x] Gemini provider wired — native API via `x-goog-api-key` (`invokeLLM` + `generateImage`)
- [x] Local-disk storage fallback (uploads + generated images, no S3 needed)
- [x] `GEMINI_API_KEY` in `.env` + dotenv `override` fix (OS env var was shadowing it)
- [x] Graceful quota/error messages (503 retry, friendly "needs billing" on 429)
- [ ] **Decision: enable Gemini billing to turn on Virtual Try-On** ← NEXT

## Phase 10 — Auth & Checkout
- [x] OAuth login + JWT cookie
- [x] **Local email/password auth** ✅ (scrypt hashing, `auth.register`/`auth.login`, same JWT session; works on localhost) — tested
- [x] Cart management
- [x] Order creation
- [ ] Real payment provider integrated (e.g. Stripe)

## Catalog content
- [x] **Real product catalog** ✅ — 45 products across 9 categories (Jerseys, Tracksuits, Training Kits, Boots, Trainers, Balls, Gym Gear, Towels, Bags) from supplied product shoots, served from `client/public/products/`
- [x] `category` column widened from enum → varchar to support new categories
- [x] Hero: side-text layout + transparent athlete cutout (right) with "GEAR UP" behind

## Phase 11 — Configuration & Secrets
- [ ] `.env` populated locally
- [ ] `.env.example` committed
- [ ] Secrets set on host (deploy)

## Phase 12 — Testing & QA
- [x] Unit tests exist (`server/*.test.ts`)
- [ ] `pnpm test` green locally
- [ ] `pnpm check` (typecheck) green
- [ ] Manual QA pass (mobile / keyboard / empty + error states)

## Phase 13 — Build & Deployment
- [ ] `pnpm build` succeeds
- [ ] Host provisioned (Node) + managed MySQL
- [ ] Env vars set on host
- [ ] Migrations + seed run against prod DB
- [ ] `pnpm start` serves in production
- [ ] Domain + HTTPS + OAuth callback configured
- [ ] Prod smoke test (order + AI features)

## Phase 14 — Post-Launch
- [ ] Monitoring / error tracking
- [ ] Analytics (purchase funnel)
- [ ] Iterate on AI prompts from logs

---

## Next Concrete Step
**✅ DONE — catalog now shows real products (Aiven MySQL).**

**Next up — pick one:**
1. [ ] Wire up an LLM key (`BUILT_IN_FORGE_API_*`) so Search / Chatbot / Size Advisor work
2. [ ] Test the full cart → checkout → order flow against the real DB
3. [ ] `.env.example` + commit, then deploy (Phase 13)
