// Vercel serverless entry. An Express app is a valid (req, res) handler, so we
// just build the app (no port binding) and export it as the default handler.
// Static files (the built SPA) are served by Vercel's CDN — see vercel.json.
//
// NOTE: product-image UPLOADS write to local disk (server/_core/localStorage.ts)
// and will NOT persist on Vercel's read-only/ephemeral filesystem. Configure a
// blob store (Forge/S3) before relying on uploads in production.
import { createApp } from "../server/_core/index";

export default createApp();
