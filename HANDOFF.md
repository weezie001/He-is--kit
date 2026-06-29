# HEIS KITS — Session Handoff

> Read this first if you're picking up this project in a new chat. It captures
> current state, how to run, the non-obvious gotchas, and what's next.

## What this is
HEIS KITS — an AI-powered football/sports apparel store.
Stack: **React 19 + Vite + Tailwind v4 + wouter** (client) · **Express + tRPC v11** (server) · **Drizzle ORM + MySQL** (Aiven) · **Gemini** for AI · **football-data.org** for live scores.
Single process: the Express server serves the Vite app (dev) and the API at `/api/trpc`.

## ⚡ Latest state — 2026-06-29 (LAUNCH DAY) — read this first
The store is **live in production at https://heiskits.com** (custom domain, apex + www, HTTPS) and **taking REAL payments**. Much of the body below is still accurate but predates these changes:
- **Domain:** `heiskits.com` is primary; `heis-kits.vercel.app` still works.
- **Payments — Flutterwave LIVE.** Live secret + public key + webhook secret hash set in Vercel; provider verified live. Webhook = `https://heiskits.com/api/payments/webhook`. ⚠️ Owner's **KYC** must be completed in the Flutterwave dashboard before sales are **withdrawable** (collection works without it).
- **Email LIVE (Resend):** `heiskits.com` verified (DKIM/SPF/DMARC); `RESEND_API_KEY` + `MAIL_FROM=HEIS KITS <orders@heiskits.com>`, `ADMIN_NOTIFY_EMAIL=orders@heiskits.com`.
- **Google sign-in LIVE:** `GOOGLE_CLIENT_ID/SECRET` set.
- **Owner admin:** `OWNER_EMAIL=Shekwolohaggai@gmail.com` is auto-promoted to admin on sign-in (in `upsertUser`). All test users were deleted; **`admin@heiskits.com` kept as fallback — delete it once the owner confirms the Gmail admin works.**
- **Virtual Try-On now runs on OpenAI `gpt-image-1.5`** (Gemini image billing couldn't be funded — Google rejected the Nigerian card; OpenAI accepted). `OPENAI_API_KEY` + `OPENAI_IMAGE_MODEL` set; `server/_core/imageGeneration.ts` uses `/v1/images/edits` (multipart) and prefers OpenAI → Gemini → forge. gpt-image-2 is sharper but ~80s (times out the function). Try-on is **clothing-only** (jerseys/trainers/gym), confirm-size-first, **white bg, head-to-waist for jerseys, face preserved, 4K, "HEIS KITS" watermark, downloadable**; **budget quota** `TRYON_USER_CAP=5`/`TRYON_GLOBAL_CAP=90` (env), cached per (user,product,size) in the **`tryOnUsage`** table; **try-on history** in profile; **full-screen Lightbox** on results. Function `maxDuration` bumped to 60s.
- **Image search** also lives in the catalog now (icon before the search bar); the search bar has typeahead suggestions + recent-search history (localStorage); magnify moved to the right.
- **Size Advisor v2:** mannequin body-types + **Chest/Shoulder/Length** measurement selectors + click-to-open size chart (`SIZE_CHART` in `pages/SizeAdvisor.tsx`).
- **Nav:** Catalog category dropdown removed — plain Catalog · Size Advisor · Livescore · Expert · Support. Product sizes sorted XS→XXL.
- **Home:** Featured Drops is now a **grid + "See more"** (the side-scroll carousel was replaced); shop-features after hero; hero parallax slide-in; **catalog has infinite scroll**.
- **SEO:** OG/Twitter meta + `robots.txt` + dynamic **`/sitemap.xml`** (Express route, routed in `vercel.json`) + **Google Search Console verified** (HTML file in `client/public/google…html`). **Favicon** at `client/public/favicon.svg`.
- **🚀 Launch system (tonight 8 PM WAT):** `shared/const.ts` → `LAUNCH_AT_MS = 2026-06-29T19:00:00Z`, `LAUNCH_PROMO_BUYERS = 3`. `LaunchOverlay` (poster `client/public/launch-poster.png` + live countdown + add-to-calendar .ics/Google + dismiss; **shows every refresh**) mounted in `Layout`; small persistent `LaunchCountdown` pill in the hero. **New-account signups (email + Google) are BLOCKED until `LAUNCH_AT_MS`** (`auth.register` + `googleOAuth.ts`; owner exempt). After launch the top ticker turns red with the free-mystery-gift promo until **3 distinct customers purchase** (`launch.status` + `db.countDistinctBuyersSince`). **⚠️ After the event, this is dead weight — retire it (or set `LAUNCH_AT_MS` to the past) once the promo's done.**
- **🔒 Security:** the dev machine had a **NetSupport RAT + clipboard clipper** (found & removed; Defender clean). **Rotate keys exposed during that window** — DB password (highest) + the OpenAI key (was pasted in chat). Resend/Google/Gemini keys already rotated.

### Real NEXT priorities
1. **Move the DB off the Aiven free trial** (paid/non-expiring) — #1 risk now that real money flows (Gotcha #8).
2. **Complete Flutterwave KYC** so sales are withdrawable, then do **one small real test purchase** to confirm end-to-end.
3. **Rotate the DB password + OpenAI key** (malware follow-up).
4. **Delete `admin@heiskits.com`** once the owner confirms Gmail admin access.
5. **After 8 PM:** confirm overlay clears + signups open + promo ticker shows; later retire the launch code.

## Deployment (GitHub + Vercel)
- **Source:** https://github.com/weezie001/He-is--kit (public, branch `main`). `origin` is set locally. ⚠️ `gh` is **not** authenticated in this env — pushes go through the user's machine (`git push`, via Git Credential Manager) or a token. The project has its **own** git repo (the parent `C:\Users\USER` is, separately, an accidental git repo — don't commit/push from there).
- **Live:** https://heis-kits.vercel.app (Vercel project `heis-kits`, account `wisdomemmanuelenang-1142`). Production.
- **Architecture:** static SPA on Vercel's CDN (`dist/public`) + the Express app as a serverless function at `api/index.ts`, which imports the **bundled** `dist/app.js`. Routing is in `vercel.json` (`/api`, `/oauth`, `/manus-storage`, `/local-storage` → function; everything else → SPA `index.html`).
  - Why the bundle: the project is `type:module` with extensionless imports, which Node's ESM loader can't resolve when Vercel transpiles file-by-file. `server/_core/app.ts` (createApp, **no Vite/Tailwind imports**) is esbuild-bundled to `dist/app.js` by `pnpm run build`; the function imports that single self-contained file.
- **Redeploy:** `vercel deploy --prod` from the repo root (CLI is logged in).
- **Env vars** are set in the Vercel project (production) — DATABASE_URL, JWT_SECRET, OAUTH_SERVER_URL, OWNER_OPEN_ID, GEMINI_API_KEY, LIVESCORE_API_KEY, ADMIN_NOTIFY_EMAIL, FLUTTERWAVE_*, MAIL_FROM, VITE_*. Still to add to go fully live: `RESEND_API_KEY` (email), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Google sign-in). Manage via `vercel env`. **Env changes only take effect on the next deploy** (`vercel deploy --prod`).
- **Uploads use Vercel Blob in production.** `server/storage.ts` `storagePut` uploads to **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set (store `heis-kits-uploads`, public; token is in the Vercel project env, all environments), returning a public CDN URL stored on the product. Locally (no token) it falls back to local disk (`.local-storage`). This replaced the old read-only-FS `ENOENT mkdir /var/task/.local-storage` failure. (`.env.local` holds the pulled dev token and is gitignored.)
  - **Compression:** uploads are resized (max 1600px) + re-encoded to **WebP (~q80)** by `sharp` (`server/_core/imageProcess.ts`) before storage → a typical product image ends up ~100–300 KB (verified live: 24 KB PNG → ~2 KB WebP). sharp is dynamically imported + guarded, so an upload falls back to the original on any failure. `@img/sharp-linux-x64` is in the lockfile so it installs on Vercel.
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
- **Payments** — provider auto-selected by which keys are present: **Flutterwave** (preferred) → **Paystack** → **MOCK**. Absent keys ⇒ MOCK gateway (full flow still works via `/checkout/mock-pay`). See `server/_core/payments.ts`.
  - **Flutterwave (current target):** `FLUTTERWAVE_SECRET_KEY` + `FLUTTERWAVE_PUBLIC_KEY` + `FLUTTERWAVE_SECRET_HASH`. Get **test** keys from the Flutterwave dashboard → *Settings → API Keys* (they start `FLWSECK_TEST-…` / `FLWPUBK_TEST-…`). Set the webhook to `<base>/api/payments/webhook` and a **Secret hash** under *Settings → Webhooks* — that exact hash goes in `FLUTTERWAVE_SECRET_HASH` (sent back as the `verif-hash` header; the webhook 401s if it doesn't match). Test cards: see Flutterwave docs (e.g. `5531 8866 5214 2950`, any future expiry, CVV `564`, OTP `12345`, PIN `3310`).
  - **Flutterwave specifics in code:** amounts are sent in **major units (Naira, not kobo)** — the abstraction normalises everything to Naira and each provider converts internally (Paystack ×100). Init = `POST /v3/payments` (returns `data.link` to redirect to). Verify = `GET /v3/transactions/verify_by_reference?tx_ref=<ref>` (verify by *our* tx_ref, so we never thread the gateway `transaction_id`). The redirect_url is **clean (no query string)** because Flutterwave appends `?status=&tx_ref=&transaction_id=` and a pre-existing `?` corrupts it — `CheckoutVerify` reads `reference` **or** `tx_ref`.
  - **Paystack (fallback):** `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY`; webhook HMAC-SHA512 via `x-paystack-signature`. Still fully wired; only used if no Flutterwave key is set.
- **Email** — `RESEND_API_KEY` + `MAIL_FROM` (verified sender). Absent ⇒ mailer logs emails to the server console (dev). See `server/_core/mailer.ts`. `MAIL_FROM` is set to `HEIS KITS <noreply@heiskits.com>` (in Vercel prod + `.env`); **the `heiskits.com` domain must be verified in Resend** (add the DNS records Resend gives you) before customer mail actually delivers. Transactional set (all use the shared `shell` template, all user values escaped via `esc`): **welcome** (new signup), **order confirmation** (on paid), **order shipped** (admin sets status→shipped), **order cancelled** (customer/admin cancel), **password reset**; **admin alerts** → `ADMIN_NOTIFY_EMAIL`: new-order, **new-signup**, new-support. Emails are `await`ed (not fire-and-forget) so they complete inside the Vercel function.
- **Google OAuth (standalone "Continue with Google")** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. Create an OAuth 2.0 **Web application** client in the Google Cloud Console; **Authorized redirect URI** = `<origin>/api/auth/google/callback` (add both `https://heis-kits.vercel.app/...` and `http://localhost:3000/...`). Code in `server/_core/googleOAuth.ts` (auth-code flow, `state` CSRF cookie, account-linking by **verified** email, issues the same HS256 JWT session). Routes: `GET /api/auth/google` + `/api/auth/google/callback`. Absent keys ⇒ the button is hidden (`auth.providers` query returns `{google:false}`) and the route redirects to `/login?error=google_unavailable`. Independent of the Manus "HEIS ID" portal (still present).
- **`ADMIN_NOTIFY_EMAIL`** = `Shekwolohaggai@gmail.com` (in `.env`) — the business inbox that receives new-order + new-signup + new-support-message notifications. (Only actually delivered once `RESEND_API_KEY` is set; logged to console until then.)
- **`BLOB_READ_WRITE_TOKEN`** — auto-provisioned by the linked Vercel Blob store `heis-kits-uploads` (set in Vercel for all envs; mirrored to gitignored `.env.local` for local use). Enables Blob uploads; absent ⇒ local-disk fallback.
- **OpenAI IS configured** (since launch) — virtual try-on runs on `gpt-image-1.5` via `OPENAI_API_KEY` + `OPENAI_IMAGE_MODEL` (`server/_core/imageGeneration.ts`, `/v1/images/edits` multipart; prefers OpenAI → Gemini → forge). Outputs go through `storagePut` (Blob in prod). Prepaid balance is the hard spend ceiling; see the "Latest state" section above for the try-on quota/cache/watermark details.
- Optional `APP_BASE_URL` — overrides the request-derived origin for payment callbacks / reset links.

## ⚠️ Gotchas (these cost real time — read them)
1. **Gemini free tier = 20 requests/min.** Chat/search/try-on share it; under rapid testing it 429s and recovers in ~45s. Not a bug.
2. **Virtual Try-On now runs on OpenAI `gpt-image-1.5`**, not Gemini (Gemini image gen needs paid billing — its free-tier limit is literally 0 — and Google rejected the owner's Nigerian card, so OpenAI was funded instead). Spend ceiling = the prepaid OpenAI balance; in-app quota `TRYON_USER_CAP=5`/`TRYON_GLOBAL_CAP=90` + per-(user,product,size) cache. gpt-image-2 is sharper but ~80s → times out the 60s function, so stay on 1.5.
3. **Preview screenshots time out** (external Unsplash/product images + a dead analytics script keep the network busy). Use `preview_eval` DOM/computed-style checks and open in the real browser instead. `preview_click`+immediate `preview_eval` can race React — add a ~300ms wait.
4. **WebM alpha (transparent hover video) does NOT encode** in this ffmpeg build (`alphaextract` confirms no alpha). That feature was reverted to static images — don't retry it here.
5. **Dark mode**: token-flip in `.dark` (index.css). Intentionally-black sections use `.surface-dark` (fixed dark, identical in light mode). Buttons/field/tag use `var(--ink)/var(--paper)` (theme-robust). The runtime toggle works in REAL browsers; the preview headless browser has a `var()` re-resolution quirk that makes existing elements look stuck — verify dark mode by loading with `localStorage.theme='dark'` then reload, or just trust it.
6. **Catalog category** comes from `?category=` via wouter `useSearch()` (not `useLocation`). Nav has a categories dropdown.
7. Product images are 2048² on white, autocropped into `client/public/products/<category>/`. Body-type mannequins (size advisor) are torso-cropped into `client/public/bodytypes/{male,female}/` (the source grids were anatomical/nude — cropped to torso on purpose).
8. **Aiven DB can power off (free trial).** If the service powers off, its host stops resolving (**DNS NXDOMAIN**) → the static site still loads but **every DB endpoint 500s** ("Failed query … from products"), and local connects fail with `ENOTFOUND`. This happened once and was real, not a code bug. **Recover:** power the service back on in the Aiven console (console.aiven.io) — data persists, host/credentials are unchanged, **no code/env change needed**, and the live site self-recovers once DNS propagates (~few min). Diagnose fast with a DoH lookup of the DB host (`Status:3` = NXDOMAIN = service down) vs a known host. To stop recurrence, move off the trial (paid plan / non-expiring MySQL).

## Design system (hype / Nike SNKRS)
- Fonts: **Anton** (display, `.display` class) + **Archivo** (body). Palette: white/`#0a0a0b` ink + **blaze `#ff2e1f`** accent. Tokens in `client/src/index.css` (`:root` + `.dark` + `@theme inline`).
- Reusable: `components/tech` (Marker/TechLabel/Tag…), `Layout` (nav + footer; `SearchOverlay` exists but is no longer wired — nav search routes to `/catalog?focus=search`), `ProductCard`, `Reveal` (scroll-in), `Skeleton`, utility classes `.btn`, `.tag`, `.field`, `.surface-dark`, `.marquee`.

## Current state — DONE
- Full storefront redesigned (Home/hero, Catalog w/ dropdown filter, Product detail, Cart, Checkout, Search-as-overlay, Size Advisor w/ photoreal mannequins + cm/ft & kg/lb, Expert Chat w/ image upload + product recs, Profile).
- Catalog: **45 real products, 9 categories**, seeded from supplied shoots.
- AI (Gemini): conversational search, image search, expert chatbot (recommends products + reads images), virtual try-on (built; needs billing).
- **Livescore** page (1st-ish in nav) with match tables + "Recommended for you" = jersey of each team playing today (Gemini + heuristic).
- Home: hero (standard full-height), match ticker + Match Center, AI section (mockup images), **Featured = static manually-scrollable carousel** (`components/FeaturedCarousel.tsx` — native touch swipe + mouse click-drag + arrow buttons w/ rAF tween; no auto-scroll), Gear Up CTA (mannequins cutout).
- Auth: **email/password** (scrypt) + **standalone Google OAuth** ("Continue with Google", `server/_core/googleOAuth.ts`, account-linking by verified email) + Manus "HEIS ID" OAuth. Cart count badge in nav.
- **Transactional email** (`server/_core/mailer.ts`, Resend + console fallback): welcome, order confirmation, order shipped, order cancelled, password reset; admin alerts (new-order, new-signup, new-support) → `ADMIN_NOTIFY_EMAIL`. Wired into register, Google signup, paid-order, admin order-status update, and cancel flows.
- **Settings page** `/settings` with sub-pages (Profile, Address, Appearance/theme, Notifications, Password, Sign out + Delete account). Profile dashboard (Amazon-style) shows after the quiz.
- **Orders**: tracking timeline + **cancel before delivery**. Schema has `trackingNumber/carrier/estimatedDelivery/status`.
- **Admin panel** at `/admin` (+ `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/support`). Role-gated by `adminProcedure` (server, `server/_core/trpc.ts`) AND `AdminLayout` (client). Dark sidebar shell. Dashboard (stat cards + **recharts analytics**: sales-last-14-days area + revenue-by-category bar, status breakdown, recent orders, low stock); Products CRUD with **category tabs** + **multi-image upload** (jpg/png/gif/webp) and add-by-URL, primary-image picker, sizes editor; Orders list + manage (status/tracking/payment) with **full per-item previews** (image/name/category/color/size/qty/line-total) + row thumbnails; Customers list; **Support inbox**. `admin` tRPC router in `server/routers.ts` (incl. `admin.analytics`, `admin.products.uploadImage`); admin DB helpers in `server/db.ts`.
- **Customer support chat**: `/support` (customer) ↔ `/admin/support` (admin inbox). One thread per user, polling every 5s, unread badges. `support` tRPC router (customer = protectedProcedure, admin = adminProcedure); `supportMessages` table (sender enum user|admin, readByUser/readByAdmin). Linked in storefront nav + footer.
- **Flexible categories**: categories are derived from live product data, NOT a fixed list. `products.categories` query + `client/src/lib/categories.ts` (`labelizeCategory`, `useCategories`). Nav dropdown, catalog pills, admin tabs all dynamic; admin product form category is free-text (normalised to a slug) with a datalist of existing ones.
- **Hero**: standard full-height (min-h ~88vh desktop). **Search**: nav search button → `/catalog?focus=search`; Catalog has a search panel in front of "Shop all" + live text filter + category pills (old `SearchOverlay` is no longer wired in `Layout`).
- **Images**: admin uploads → `storagePut` (`server/storage.ts`) → **Vercel Blob** in prod (public CDN URL), `.local-storage/` in dev; auto-compressed to WebP via `sharp` (see Deployment). Schema: `products.imageUrl` (primary) + `products.imageUrls` (full gallery JSON). Catalog category pills show **labels only** (counts + the "N products" header were removed on request; prices kept).
- Security: `auth.me` now strips `passwordHash` via `sanitizeUser` (server/routers.ts).
- **Production hardening (top-5)**:
  - **Payments**: `payments` router (initialize→redirect→verify) + **Flutterwave / Paystack / mock** adapters (`server/_core/payments.ts`); checkout reworked (`Checkout.tsx` → `/checkout/verify`, `/checkout/mock-pay`); webhook at `/api/payments/webhook` (provider-dispatched: Flutterwave `verif-hash` header, Paystack raw-body HMAC; + amount check). Order is PENDING until paid; **amount verified** against total (normalised to minor units) before finalizing; **idempotent** finalize via atomic status claim (webhook+callback race-safe, emails/stock once).
  - **Stock**: decrement on paid (txn, `stock` + per-size map), restore on cancel; atomic claims prevent double decrement/restore.
  - **Auth**: password reset (`/reset-password`, `passwordResetTokens` hashed single-use 1h tokens, `sendPasswordResetEmail`), brute-force **lockout** (5 attempts → 15min via `users.failedLoginAttempts`/`lockedUntil`).
  - **Security mw**: `helmet` (CSP off for Vite/images), `express-rate-limit` on `/api/trpc` + webhook, `trust proxy`.
  - **Email**: `server/_core/mailer.ts` (Resend + console fallback) — order receipt, password reset, + admin new-order/new-support notifications to `ADMIN_NOTIFY_EMAIL`.
  - **Legal**: `/terms` `/privacy` `/returns` `/shipping` (`Legal.tsx`, edit `BUSINESS` constants) + cookie-consent banner (`CookieConsent.tsx`).

## Admin access
- A test admin account exists (**admin@heiskits.com**); its password is kept out of version control. Reset/issue admin via `node --import tsx scripts/make-admin.mjs <email>` (then use the normal password-reset flow, or set one in the DB).
- The store owner is also auto-promoted on OAuth sign-in (`OWNER_OPEN_ID` in `.env`).
- To grant admin to any email/password account: `node --import tsx scripts/make-admin.mjs <email>` (add `--demote` to revoke). Role is read fresh from the DB each request, so a page reload picks it up — no re-login needed.

## NEXT TASK — see "Latest state → Real NEXT priorities" at the top
Payments/email/Google/try-on are all **LIVE** now (the old "Flutterwave test" task below is superseded — kept only as a record). The real to-do list is in the **Latest state** section: (1) move the DB off the Aiven free trial, (2) finish Flutterwave KYC + one real test purchase, (3) rotate the DB + OpenAI keys (malware), (4) delete `admin@heiskits.com`, (5) retire the launch code after the event.

History — Flutterwave was first verified against the **test** API (init returns a real hosted link; verify resolves unpaid refs to `failed`), then switched to **live** keys in Vercel for launch. Test cards (test mode only): `5531 8866 5214 2950`, exp any future, CVV `564`, OTP `12345`.

Lower-priority follow-ups: product-detail gallery using `imageUrls`; drag-to-reorder images; admin pagination/sorting as the catalog grows.
- Pushing to GitHub from this agent env needs the user's machine/token (gh unauthenticated).

## Tracking docs
- `PROGRESS.md` — phase checklist (somewhat behind this handoff).
- `BUILD_GUIDE.md` — original build playbook.
