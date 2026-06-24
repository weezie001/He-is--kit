// Local-disk storage fallback used when the Forge/Manus storage backend is not
// configured (e.g. running against Gemini + a self-hosted DB locally).
//
// Files are written under <repo>/.local-storage and served by the static route
// registered in registerLocalStorage(). URLs are returned as /local-storage/<key>.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { Express } from "express";

export const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".local-storage");
export const LOCAL_STORAGE_ROUTE = "/local-storage";

function normalizeKey(relKey: string): string {
  // Strip leading slashes and any ".." segments to keep writes inside the dir.
  return relKey
    .replace(/^\/+/, "")
    .split("/")
    .filter(seg => seg && seg !== "..")
    .join("/");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const buffer =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  await fs.writeFile(filePath, buffer);
  return { key, url: `${LOCAL_STORAGE_ROUTE}/${key}` };
}

// Serves files written by localStoragePut.
export function registerLocalStorage(app: Express) {
  app.get(`${LOCAL_STORAGE_ROUTE}/*`, async (req, res) => {
    const key = normalizeKey((req.params as any)[0] || "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    const filePath = path.join(LOCAL_STORAGE_DIR, key);
    try {
      const data = await fs.readFile(filePath);
      res.set("Cache-Control", "no-store");
      res.type(path.extname(filePath) || "application/octet-stream");
      res.send(data);
    } catch {
      res.status(404).send("Not found");
    }
  });
}
