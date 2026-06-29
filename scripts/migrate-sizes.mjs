// One-off migration: re-key product sizes to the launch scheme without touching
// names/images/descriptions. Clothes → M/L/XL (preserving existing M/L/XL stock
// where present), footwear → EU 41-45. One-size categories are left untouched.
// Classification is shared with the app via shared/const.ts (sizeKind).
// Run: node --import tsx scripts/migrate-sizes.mjs
import dotenv from "dotenv";
dotenv.config({ override: true });
import mysql from "mysql2/promise";
import { buildMysqlPoolConfig } from "../server/_core/dbConfig.ts";
import { sizeKind } from "../shared/const.ts";

const FOOTWEAR_SIZES = { "41": 10, "42": 15, "43": 15, "44": 10, "45": 8 };
const sum = (o) => Object.values(o).reduce((a, b) => a + Number(b || 0), 0);

async function run() {
  const conn = await mysql.createConnection(buildMysqlPoolConfig(process.env.DATABASE_URL));
  try {
    const [rows] = await conn.execute("SELECT id, category, sizes FROM products");
    let apparel = 0, footwear = 0, untouched = 0;
    for (const r of rows) {
      const kind = sizeKind(r.category);
      let sizes = null;
      if (kind === "apparel") {
        const old = r.sizes && typeof r.sizes === "object" ? r.sizes : {};
        // keep existing M/L/XL counts, drop other sizes, default if missing
        sizes = { M: Number(old.M ?? 25), L: Number(old.L ?? 25), XL: Number(old.XL ?? 15) };
        apparel++;
      } else if (kind === "footwear") {
        sizes = { ...FOOTWEAR_SIZES };
        footwear++;
      } else {
        untouched++;
        continue;
      }
      await conn.execute("UPDATE products SET sizes = ?, stock = ? WHERE id = ?", [
        JSON.stringify(sizes),
        sum(sizes),
        r.id,
      ]);
    }
    console.log(`✓ Sizes migrated — apparel(M/L/XL): ${apparel}, footwear(41-45): ${footwear}, one-size left as-is: ${untouched}`);
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
