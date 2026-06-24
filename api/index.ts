// Vercel serverless entry. The project is ESM with extensionless imports, which
// Node's ESM loader can't resolve when transpiled file-by-file — so we import a
// pre-BUNDLED build of the app (esbuild resolves every import into one file).
// We bundle server/_core/app.ts (NOT index.ts) so no Vite/Tailwind dev tooling
// is pulled into the function. createApp() returns the Express app, which is a
// valid (req, res) serverless handler.
//
// Static files (the built SPA) are served by Vercel's CDN — see vercel.json.
// NOTE: product-image uploads write to local disk and will NOT persist on
// Vercel's read-only/ephemeral filesystem until a blob store is configured.
// @ts-expect-error - ../dist/app.js is generated at build time by `pnpm run build`
import { createApp } from "../dist/app.js";

export default createApp();
