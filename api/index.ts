// Vercel serverless entry. The project is ESM with extensionless imports, which
// Node's ESM loader can't resolve when transpiled file-by-file. So we import the
// pre-BUNDLED server (produced by `pnpm run build` → esbuild bundles everything
// into dist/index.js, resolving all imports). createApp() builds the Express app
// without binding a port; an Express app is a valid (req,res) serverless handler.
//
// Static files (the built SPA) are served by Vercel's CDN — see vercel.json.
// NOTE: product-image uploads write to local disk and will NOT persist on
// Vercel's read-only/ephemeral filesystem until a blob store is configured.
// @ts-expect-error - ../dist/index.js is generated at build time by `pnpm run build`
import { createApp } from "../dist/index.js";

export default createApp();
