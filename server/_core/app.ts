// The Express app (middleware + API routes) with NO Vite/dev-tooling imports,
// so it can be bundled for serverless (Vercel) without pulling in Tailwind/
// lightningcss/Vite. startServer() (local long-running process) lives in
// ./index.ts and adds static/Vite serving on top of this.
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./googleOAuth";
import { registerStorageProxy } from "./storageProxy";
import { registerLocalStorage } from "./localStorage";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { getOrderByReference, finalizePaidOrder } from "../db";
import { sendOrderConfirmationEmail, notifyAdminNewOrder } from "./mailer";
import { paymentsProvider } from "./payments";

/**
 * Build the Express app (middleware + API routes) WITHOUT binding a port or
 * serving static files. An Express app is a valid (req, res) handler, so this
 * is used directly as the Vercel serverless function; startServer() wraps it
 * for the local long-running process.
 */
export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // correct client IP behind the dev/prod proxy (rate limiting)

  // Security headers. CSP/COEP are disabled so Vite (dev) and external images
  // keep working; the other hardening headers (nosniff, frameguard, HSTS,
  // referrer-policy, etc.) still apply. Cross-origin resource policy is relaxed
  // so product/storage images load.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Payment webhook — must read the RAW body to verify the signature, so it is
  // registered before express.json(). Rate-limited (it's a public endpoint).
  app.use("/api/payments/webhook", rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));
  app.post("/api/payments/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    try {
      const provider = paymentsProvider();
      if (provider === "mock") return res.status(200).json({ ok: true }); // no real gateway configured
      const raw = req.body as Buffer;

      // Authenticate + extract (reference, paidMinor, succeeded) per provider.
      // Amounts are normalised to MINOR units (kobo) for the mismatch check.
      let reference: string | null = null;
      let paidMinor: number | null = null;
      let succeeded = false;

      if (provider === "flutterwave") {
        // Flutterwave authenticates with a static "Secret hash" you set in the
        // dashboard, echoed back as the `verif-hash` header (not an HMAC).
        if (!ENV.flutterwaveSecretHash || req.headers["verif-hash"] !== ENV.flutterwaveSecretHash) {
          return res.status(401).json({ ok: false });
        }
        const event = JSON.parse(raw.toString("utf8"));
        const d = event?.data || {};
        reference = d.tx_ref || null;
        succeeded = event?.event === "charge.completed" && d.status === "successful";
        paidMinor = typeof d.amount === "number" ? Math.round(d.amount * 100) : null; // major → minor
      } else {
        // Paystack — HMAC-SHA512 of the raw body keyed by the secret.
        const expected = crypto.createHmac("sha512", ENV.paystackSecretKey).update(raw).digest("hex");
        if (req.headers["x-paystack-signature"] !== expected) return res.status(401).json({ ok: false }); // generic — no recon hints
        const event = JSON.parse(raw.toString("utf8"));
        reference = event?.data?.reference || null;
        succeeded = event?.event === "charge.success" && !!reference;
        paidMinor = typeof event?.data?.amount === "number" ? event.data.amount : null; // already kobo
      }

      if (succeeded && reference) {
        const order = await getOrderByReference(reference);
        if (order) {
          const expectedMinor = Math.round(Number(order.totalAmount) * 100);
          if (paidMinor !== null && paidMinor < expectedMinor) {
            console.warn("[webhook] amount mismatch", paidMinor, "<", expectedMinor);
          } else {
            const { order: finalized, transitioned } = await finalizePaidOrder(order.id, reference);
            if (transitioned) {
              const addr: any = finalized?.shippingAddress || {};
              if (addr.email) { try { await sendOrderConfirmationEmail(addr.email, finalized); } catch { /* logged */ } }
              try { await notifyAdminNewOrder(finalized, { name: addr.name, email: addr.email }); } catch { /* logged */ }
            }
          }
        }
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.warn("[webhook] error:", err);
      res.status(200).json({ ok: true }); // ack to avoid retry storms; logged above
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Basic rate limiting on the API (300 req/min/IP; tRPC batches several calls).
  app.use("/api/trpc", rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));

  registerStorageProxy(app);
  registerLocalStorage(app);
  registerOAuthRoutes(app);
  registerGoogleAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
