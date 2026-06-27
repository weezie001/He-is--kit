# HEIS KITS — Build Checklist & Progress Tracker

> Companion to [BUILD_GUIDE.md](BUILD_GUIDE.md) / [HANDOFF.md](HANDOFF.md).
> Status legend: ✅ done · 🟡 in progress · ⬜ not started · 🚫 blocked
> **Last updated:** 2026-06-27

**Overall:** 🟢 **LIVE in production at https://heiskits.com** — store, AI features,
email, Google sign-in, SEO, and **live Flutterwave payments** are all wired.
Remaining work is launch-safety hardening (see bottom): move the DB off the free
trial, finish Flutterwave KYC, rotate exposed keys.

---

## 🟢 Live in production
- ✅ **Deployed on Vercel** + **custom domain `heiskits.com`** (apex + www, HTTPS, SSL issued)
- ✅ **Database** — Aiven MySQL, schema migrated (now 10 tables incl. matchHistory, tryOnUsage), 45 products seeded
- ✅ **Email (Resend)** — `heiskits.com` domain verified (DKIM/SPF/DMARC); sends welcome, order-confirm, shipped, cancelled + admin new-order/new-signup from `orders@heiskits.com`
- ✅ **Auth** — local email/password + **"Continue with Google"** (standalone OAuth); account-takeover hardening applied
- ✅ **Owner admin** — `OWNER_EMAIL` (Shekwolohaggai@gmail.com) auto-promoted to admin on sign-in
- ✅ **Payments — Flutterwave LIVE** — live secret + public key + webhook secret hash wired; webhook `POST /api/payments/webhook`; provider verified live in prod
- ✅ **SEO + social** — meta/OG/Twitter cards, `robots.txt`, dynamic `sitemap.xml` (products), Google Search Console **verified**
- ✅ **Favicon** (HEIS "H")

## Phases 0–4 — Discovery → Design → Stack
- [x] Pitch, personas, IA/flows, design tokens
- [x] **UI redesign** — Bold Sport / Hype direction (Anton + Archivo, white/black + blaze `#ff2e1f`)
- [x] Stack: React 19 / Vite / tRPC / Drizzle / MySQL, Vercel serverless (`api/index.ts`)

## Phase 6 — Data Model
- [x] Schema (`drizzle/schema.ts`) + migrations applied to prod
- [x] Tables: users, products, cartItems, orders, chatMessages, searchHistory, reviews, supportMessages, passwordResetTokens, matchHistory, tryOnUsage
- [x] 45 products seeded (9 categories)

## Phase 7–8 — Backend + Frontend
- [x] tRPC routers (products, cart, orders, auth, payments, admin, matches, search, tryOn, support, profile)
- [x] All pages + components; catalog renders real data
- [x] Catalog: **infinite scroll**, **image-search icon**, **typeahead + recent-search history**
- [x] Home: shop-features after hero, featured grid + "See more", parallax intro
- [x] Profile: orders view (active/cancelled split), **try-on history**, loyalty progress, recommendations

## Phase 9 — AI Features
- [x] Conversational Search · Size Advisor · Expert Chatbot (+ "New chat") · Smart Profiler
- [x] **Image Search** — Gemini vision (free tier), live-tested; available on `/search` + in the catalog
- [x] **Virtual Try-On** — ✅ **live on OpenAI `gpt-image-1.5`** (Gemini image billing couldn't be funded — Nigerian card rejected by Google; switched to OpenAI which accepted)
  - Clothing-only (jerseys/trainers/gym), confirm size first, white bg, **head-to-waist for jerseys**, face preserved, 4K studio look, **HEIS KITS watermark**, downloadable
  - Budget guardrail: **5/user-month**, ~90 global/month; cached per (user, product, size); OpenAI prepaid (~$7) is the hard ceiling
- [x] **Size Advisor v2** — mannequin body-types + **Chest/Shoulder/Length** measurement selectors + click-to-open size chart

## Phase 10 — Auth & Checkout & Payments
- [x] Google OAuth + local email/password (scrypt) + JWT session
- [x] Cart + order creation
- [x] **Flutterwave LIVE** integration (amounts in Naira major units; init via `/v3/payments`; verify via `verify_by_reference`; webhook auth via `verif-hash`)

## Phase 11–13 — Config / Build / Deploy
- [x] Secrets set on Vercel (DB, Resend, Google, OpenAI, Flutterwave live, OWNER_EMAIL, etc.)
- [x] `pnpm check` (typecheck) green · `pnpm build` succeeds
- [x] Deployed; prod smoke-tested (endpoints, SEO, payments config)

## Phase 14 — Post-Launch
- [x] Analytics (umami hooks present)
- [x] **Admin AI Insights** — chats + searches grouped by customer, top products
- [x] Admin sales graph with selectable date range (7/14/30/90)
- [ ] Error monitoring / alerting (not set up)

---

## 🔴 Remaining — launch-safety (do these next)
1. ⬜ **Move the database off the Aiven free trial** — biggest risk; a trial power-off would take the store + orders down. **#1 priority now that real money flows.**
2. 🟡 **Flutterwave KYC** — owner completing business verification so funds are **withdrawable** to bank (collection works; settlement needs KYC + a settlement bank account).
3. ⬜ **Live payment test** — one small real purchase → confirm wallet credit + order marked paid in /admin.
4. ⬜ **Rotate keys exposed during the (now-removed) clipboard-malware window** — DB password (highest), and the OpenAI key shared in chat. (Resend, Google secret, Gemini already rotated.)
5. ⬜ **Delete old `admin@heiskits.com`** once the owner confirms the Gmail account has admin (kept as fallback).
6. ⬜ Mobile hero — visual check on a real device; fine-tune crop if needed.

## Notes
- Dev machine had a **NetSupport RAT + clipboard clipper** — found & removed; Defender quick scan clean. Key rotation above is the follow-up.
- Try-on model is env-configurable via `OPENAI_IMAGE_MODEL` (gpt-image-2 exists but ~80s = times out the 60s function; 1.5 is the sweet spot).
