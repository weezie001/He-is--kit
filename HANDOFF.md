# HEIS KITS — Session Handoff

> Read this first if you're picking up this project in a new chat. It captures
> current state, how to run, the non-obvious gotchas, and what's next.

## What this is
HEIS KITS — an AI-powered football/sports apparel store.
Stack: **React 19 + Vite + Tailwind v4 + wouter** (client) · **Express + tRPC v11** (server) · **Drizzle ORM + MySQL** (Aiven) · **Gemini** for AI · **football-data.org** for live scores.
Single process: the Express server serves the Vite app (dev) and the API at `/api/trpc`.

## Deployment (Vercel)
- **Live:** https://heis-kits.vercel.app (Vercel project `heis-kits`, account `wisdomemmanuelenang-1142`). Production.
- **Architecture:** static SPA on Vercel's CDN (`dist/public`) + the Express app as a serverless function at `api/index.ts`, which imports the **bundled** `dist/app.js`. Routing is in `vercel.json` (`/api`, `/oauth`, `/manus-storage`, `/local-storage` → function; everything else → SPA `index.html`).
  - Why the bundle: the project is `type:module` with extensionless imports, which Node's ESM loader can't resolve when Vercel transpiles file-by-file. `server/_core/app.ts` (createApp, **no Vite/Tailwind imports**) is esbuild-bundled to `dist/app.js` by `pnpm run build`; the function imports that single self-contained file.
- **Redeploy:** `vercel deploy --prod` from the repo root (CLI is logged in).
- **Env vars** are set in the Vercel project (production) — DATABASE_URL, JWT_SECRET, OAUTH_SERVER_URL, OWNER_OPEN_ID, GEMINI_API_KEY, LIVESCORE_API_KEY, ADMIN_NOTIFY_EMAIL, VITE_*. Add `PAYSTACK_*` / `RESEND_API_KEY` there to go live on payments/email. Manage via `vercel env`.
- ⚠️ **Uploads don't persist on Vercel.** Product-image uploads write to local disk (`.local-storage`), which is read-only/ephemeral on serverless — image upload is effectively broken until storage is switched to a blob store (Forge/S3 via `server/storage.ts`, or Vercel Blob). Everything else (catalog, AI, auth, orders, payments-mock, admin, support) works.
- Local `pnpm start` still serves everything (SPA + API) as a single long-running process — `index.ts` is the local entry; `app.ts` is shared with the serverless function.

## How to run / verify
- Dev server (preview): use the Preview tool → `preview_start` with name `heis-kits` (config in `.claude/launch.json`). It runs `scripts/dev-launch.mjs` (sets NODE_ENV, boots `server/_core/index.ts`).
- **After ANY server/router change you MUST restart** the preview (`preview_stop` then `preview_start`) — tsx watch doesn't reliably hot-reload tRPC procedures, and you'll get "No procedure found".
- Typecheck: `corepack pnpm check` (must stay green; tsconfig has noUnusedLocals — remove unused vars).
- Package manager is **pnpm via corepack** (`corepack pnpm ...`). Plain `pnpm` isn't on PATH.
- DB migrations: edit `drizzle/schema.ts` → `corepack pnpm db:push`.
- Reseed catalog: `node --import tsx scripts/seed-products.mjs`.

## External services & .env (all on disk, gitignored)
- `DATABASE_URL` — Aiven MySQL 8.4 (remote, persists). SSL handled in `server/_core/dbConfig.ts`.
- `GEMINI_API_KEY` — token starting `AQ.Ab8…`. Auth via `x-goog-api-key` on the **native** Gemini API (the OpenAI-compat endpoint rejects it). See `server/_core/llm.ts` (`invokeGeminiNative`) + `imageGeneration.ts`.
- `LIVESCORE_API_KEY` — football-data.org token (`X-Auth-Token`). See `server/_core/matches.ts`.
- There's an OS-level `GEMINI_API_KEY` env var that's INVALID and shadows `.env`; fixed by `dotenv.config({ override: true })` at the top of `server/_core/env.ts`. Don't remove that.
- **Payments** — `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY`. Absent ⇒ MOCK gateway (full flow still works via `/checkout/mock-pay`). Set them to go live; also set the Paystack dashboard webhook to `<base>/api/payments/webhook`. See `server/_core/payments.ts`.
- **Email** — `RESEND_API_KEY` + `MAIL_FROM` (verified sender). Absent ⇒ mailer logs emails to the server console (dev). See `server/_core/mailer.ts`.
- **`ADMIN_NOTIFY_EMAIL`** = `Shekwolohaggai@gmail.com` (in `.env`) — the business inbox that receives new-order + new-support-message notifications. (Only actually delivered once `RESEND_API_KEY` is set; logged to console until then.)
- Optional `APP_BASE_URL` — overrides the request-derived origin for payment callbacks / reset links.

## ⚠️ Gotchas (these cost real time — read them)
1. **Gemini free tier = 20 requests/min.** Chat/search/try-on share it; under rapid testing it 429s and recovers in ~45s. Not a bug.
2. **Gemini image generation (Virtual Try-On) needs billing enabled** — free tier limit is literally 0 for `gemini-2.5-flash-image`. Try-on is built + gated with a friendly "needs billing" message.
3. **Preview screenshots time out** (external Unsplash/product images + a dead analytics script keep the network busy). Use `preview_eval` DOM/computed-style checks and open in the real browser instead. `preview_click`+immediate `preview_eval` can race React — add a ~300ms wait.
4. **WebM alpha (transparent hover video) does NOT encode** in this ffmpeg build (`alphaextract` confirms no alpha). That feature was reverted to static images — don't retry it here.
5. **Dark mode**: token-flip in `.dark` (index.css). Intentionally-black sections use `.surface-dark` (fixed dark, identical in light mode). Buttons/field/tag use `var(--ink)/var(--paper)` (theme-robust). The runtime toggle works in REAL browsers; the preview headless browser has a `var()` re-resolution quirk that makes existing elements look stuck — verify dark mode by loading with `localStorage.theme='dark'` then reload, or just trust it.
6. **Catalog category** comes from `?category=` via wouter `useSearch()` (not `useLocation`). Nav has a categories dropdown.
7. Product images are 2048² on white, autocropped into `client/public/products/<category>/`. Body-type mannequins (size advisor) are torso-cropped into `client/public/bodytypes/{male,female}/` (the source grids were anatomical/nude — cropped to torso on purpose).

## Design system (hype / Nike SNKRS)
- Fonts: **Anton** (display, `.display` class) + **Archivo** (body). Palette: white/`#0a0a0b` ink + **blaze `#ff2e1f`** accent. Tokens in `client/src/index.css` (`:root` + `.dark` + `@theme inline`).
- Reusable: `components/tech` (Marker/TechLabel/Tag…), `Layout` (nav + footer + SearchOverlay), `ProductCard`, `Reveal` (scroll-in), `Skeleton`, utility classes `.btn`, `.tag`, `.field`, `.surface-dark`, `.marquee`.

## Current state — DONE
- Full storefront redesigned (Home/hero, Catalog w/ dropdown filter, Product detail, Cart, Checkout, Search-as-overlay, Size Advisor w/ photoreal mannequins + cm/ft & kg/lb, Expert Chat w/ image upload + product recs, Profile).
- Catalog: **45 real products, 9 categories**, seeded from supplied shoots.
- AI (Gemini): conversational search, image search, expert chatbot (recommends products + reads images), virtual try-on (built; needs billing).
- **Livescore** page (1st-ish in nav) with match tables + "Recommended for you" = jersey of each team playing today (Gemini + heuristic).
- Home: hero (standard full-height), match ticker + Match Center, AI section (mockup images), **Featured = static manually-scrollable carousel** (`components/FeaturedCarousel.tsx` — native touch swipe + mouse click-drag + arrow buttons w/ rAF tween; no auto-scroll), Gear Up CTA (mannequins cutout).
- Auth: **email/password** (scrypt) + OAuth. Cart count badge in nav.
- **Settings page** `/settings` with sub-pages (Profile, Address, Appearance/theme, Notifications, Password, Sign out + Delete account). Profile dashboard (Amazon-style) shows after the quiz.
- **Orders**: tracking timeline + **cancel before delivery**. Schema has `trackingNumber/carrier/estimatedDelivery/status`.
- **Admin panel** at `/admin` (+ `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/support`). Role-gated by `adminProcedure` (server, `server/_core/trpc.ts`) AND `AdminLayout` (client). Dark sidebar shell. Dashboard (stat cards + **recharts analytics**: sales-last-14-days area + revenue-by-category bar, status breakdown, recent orders, low stock); Products CRUD with **category tabs** + **multi-image upload** (jpg/png/gif/webp) and add-by-URL, primary-image picker, sizes editor; Orders list + manage (status/tracking/payment) with **full per-item previews** (image/name/category/color/size/qty/line-total) + row thumbnails; Customers list; **Support inbox**. `admin` tRPC router in `server/routers.ts` (incl. `admin.analytics`, `admin.products.uploadImage`); admin DB helpers in `server/db.ts`.
- **Customer support chat**: `/support` (customer) ↔ `/admin/support` (admin inbox). One thread per user, polling every 5s, unread badges. `support` tRPC router (customer = protectedProcedure, admin = adminProcedure); `supportMessages` table (sender enum user|admin, readByUser/readByAdmin). Linked in storefront nav + footer.
- **Flexible categories**: categories are derived from live product data, NOT a fixed list. `products.categories` query + `client/src/lib/categories.ts` (`labelizeCategory`, `useCategories`). Nav dropdown, catalog pills, admin tabs all dynamic; admin product form category is free-text (normalised to a slug) with a datalist of existing ones.
- **Hero**: standard full-height (min-h ~88vh desktop). **Search**: nav search button → `/catalog?focus=search`; Catalog has a search panel in front of "Shop all" + live text filter + category pills (old `SearchOverlay` is no longer wired in `Layout`).
- **Images**: product images can be uploaded in admin → stored via `server/storage.ts` `storagePut`. Locally (no Forge env) they land in `.local-storage/` (gitignored) and are served at `/local-storage/...`. Schema: `products.imageUrl` (primary) + `products.imageUrls` (full gallery JSON).
- Security: `auth.me` now strips `passwordHash` via `sanitizeUser` (server/routers.ts).
- **Production hardening (top-5)**:
  - **Payments**: `payments` router (initialize→redirect→verify) + Paystack adapter/mock (`server/_core/payments.ts`); checkout reworked (`Checkout.tsx` → `/checkout/verify`, `/checkout/mock-pay`); webhook at `/api/payments/webhook` (raw-body HMAC verify + amount check). Order is PENDING until paid; **amount verified** against total before finalizing; **idempotent** finalize via atomic status claim (webhook+callback race-safe, emails/stock once).
  - **Stock**: decrement on paid (txn, `stock` + per-size map), restore on cancel; atomic claims prevent double decrement/restore.
  - **Auth**: password reset (`/reset-password`, `passwordResetTokens` hashed single-use 1h tokens, `sendPasswordResetEmail`), brute-force **lockout** (5 attempts → 15min via `users.failedLoginAttempts`/`lockedUntil`).
  - **Security mw**: `helmet` (CSP off for Vite/images), `express-rate-limit` on `/api/trpc` + webhook, `trust proxy`.
  - **Email**: `server/_core/mailer.ts` (Resend + console fallback) — order receipt, password reset, + admin new-order/new-support notifications to `ADMIN_NOTIFY_EMAIL`.
  - **Legal**: `/terms` `/privacy` `/returns` `/shipping` (`Legal.tsx`, edit `BUSINESS` constants) + cookie-consent banner (`CookieConsent.tsx`).

## Admin access
- A test admin account exists (**admin@heiskits.com**); its password is kept out of version control. Reset/issue admin via `node --import tsx scripts/make-admin.mjs <email>` (then use the normal password-reset flow, or set one in the DB).
- The store owner is also auto-promoted on OAuth sign-in (`OWNER_OPEN_ID` in `.env`).
- To grant admin to any email/password account: `node --import tsx scripts/make-admin.mjs <email>` (add `--demote` to revoke). Role is read fresh from the DB each request, so a page reload picks it up — no re-login needed.

## NEXT TASK → (open)
All requested features done & verified (typecheck green; charts, category tabs, order previews, support round-trip, multi-image upload all tested live). Possible follow-ups: product-detail gallery using `imageUrls`, drag-to-reorder images, support email notifications, admin pagination/sorting if the catalog grows.

## Tracking docs
- `PROGRESS.md` — phase checklist (somewhat behind this handoff).
- `BUILD_GUIDE.md` — original build playbook.
