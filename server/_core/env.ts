// Load .env with override BEFORE building ENV, so the project's .env wins over
// any stale OS-level vars (e.g. a system GEMINI_API_KEY). This must run at the
// top of the first-evaluated env module, before ENV reads process.env.
import dotenv from "dotenv";
dotenv.config({ override: true });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  // Store owner email — auto-promoted to admin on sign-in (e.g. via Google).
  ownerEmail: (process.env.OWNER_EMAIL ?? "").toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Virtual try-on monthly image budget ($5 ≈ 125 images at ~$0.04). The global
  // cap bounds total spend; the per-user cap distributes it fairly. Adjustable
  // via env so you can raise it later without a code change.
  tryOnGlobalCap: Number(process.env.TRYON_GLOBAL_CAP ?? 120),
  tryOnUserCap: Number(process.env.TRYON_USER_CAP ?? 3),
  livescoreApiKey: process.env.LIVESCORE_API_KEY ?? "", // football-data.org token (optional)

  // Email (transactional). Without a key the mailer logs to the console (dev).
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "HEIS KITS <onboarding@resend.dev>",
  // Business inbox that receives client notifications (new orders, support).
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "Shekwolohaggai@gmail.com",

  // Payments. Provider is chosen by which keys are present:
  //   Flutterwave (preferred) → Paystack → MOCK (built-in simulated gateway).
  // Flutterwave (test keys start FLWSECK_TEST-… / FLWPUBK_TEST-…).
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? "",
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY ?? "",
  // Webhook "Secret hash" you set in the Flutterwave dashboard; sent back as the
  // `verif-hash` header on every webhook so we can authenticate it.
  flutterwaveSecretHash: process.env.FLUTTERWAVE_SECRET_HASH ?? "",
  // Paystack (kept as a fallback provider).
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",

  // Google OAuth (standalone "Continue with Google"). Absent ⇒ the button is
  // hidden and /api/auth/google redirects back with an error.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // Optional explicit public base URL (otherwise derived from the request).
  appBaseUrl: process.env.APP_BASE_URL ?? "",
};
