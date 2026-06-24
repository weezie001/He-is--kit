// override: true so the project's .env wins over any stale OS-level env vars
// (e.g. a system GEMINI_API_KEY shadowing the one configured here).
import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerLocalStorage } from "./localStorage";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { getOrderByReference, finalizePaidOrder } from "../db";
import { sendOrderConfirmationEmail, notifyAdminNewOrder } from "./mailer";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
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
      if (!ENV.paystackSecretKey) return res.status(200).json({ ok: true }); // mock mode
      const raw = req.body as Buffer;
      const expected = crypto.createHmac("sha512", ENV.paystackSecretKey).update(raw).digest("hex");
      if (req.headers["x-paystack-signature"] !== expected) return res.status(401).json({ ok: false }); // generic — no recon hints
      const event = JSON.parse(raw.toString("utf8"));
      if (event?.event === "charge.success" && event?.data?.reference) {
        const order = await getOrderByReference(event.data.reference);
        if (order) {
          const expectedKobo = Math.round(Number(order.totalAmount) * 100);
          if (typeof event.data.amount === "number" && event.data.amount < expectedKobo) {
            console.warn("[webhook] amount mismatch", event.data.amount, "<", expectedKobo);
          } else {
            const { order: finalized, transitioned } = await finalizePaidOrder(order.id, event.data.reference);
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
