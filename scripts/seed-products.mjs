import dotenv from "dotenv";
dotenv.config({ override: true });
import mysql from "mysql2/promise";
import { readdirSync } from "fs";
import path from "path";
import { buildMysqlPoolConfig } from "../server/_core/dbConfig.ts";

const PRODUCTS_DIR = path.resolve("client/public/products");

// Per-category metadata: display label, price (₦), material, size kind.
const CATEGORIES = {
  club_jerseys:  { label: "Club Jerseys",  price: 45000, material: "Polyester",      sizes: "apparel"   },
  track_suits:   { label: "Track Suits",   price: 55000, material: "Polyester Blend", sizes: "apparel"  },
  training_kits: { label: "Training Kits", price: 30000, material: "Dri-Fit",         sizes: "apparel"  },
  boots:         { label: "Boots",         price: 38000, material: "Synthetic",       sizes: "footwear" },
  trainers:      { label: "Trainers",      price: 35000, material: "Mesh / Rubber",   sizes: "footwear" },
  balls:         { label: "Balls",         price: 18000, material: "TPU",             sizes: "one"      },
  gym_gear:      { label: "Gym Gear",      price: 15000, material: "Mixed",           sizes: "one"      },
  towels:        { label: "Towels",        price: 8000,  material: "Cotton",          sizes: "one"      },
  sports_bags:   { label: "Sports Bags",   price: 25000, material: "Ripstop Nylon",   sizes: "one"      },
};

const COLORS = ["white","red","blue","black","grey","gray","navy","green","maroon","yellow","sky","royal","neon","light"];
const STYLES = ["Classic", "Modern", "Bold", "Minimalist"];

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function nameFromFile(file) {
  // "03_blue_red_striped_club_jersey.png" -> "Blue Red Striped Club Jersey"
  const base = file.replace(/\.png$/i, "").replace(/^\d+_/, "").replace(/_/g, " ");
  return titleCase(base);
}

function colorFromFile(file) {
  const words = file.toLowerCase().replace(/\.png$/i, "").split(/[_\d]+/).filter(Boolean);
  const c = words.find((w) => COLORS.includes(w));
  return c ? titleCase(c === "gray" ? "grey" : c) : "Multi";
}

function sizesFor(kind) {
  if (kind === "apparel") return { XS: 8, S: 14, M: 20, L: 16, XL: 10, XXL: 5 };
  if (kind === "footwear") return { "7": 6, "8": 10, "9": 12, "10": 10, "11": 7, "12": 4 };
  return { "One Size": 40 };
}

async function seed() {
  const connection = await mysql.createConnection(buildMysqlPoolConfig(process.env.DATABASE_URL));
  try {
    console.log("Clearing existing catalog…");
    await connection.execute("DELETE FROM cartItems");
    await connection.execute("DELETE FROM products");
    await connection.execute("ALTER TABLE products AUTO_INCREMENT = 1");

    let count = 0;
    let globalIdx = 0;
    for (const [slug, meta] of Object.entries(CATEGORIES)) {
      let files;
      try {
        files = readdirSync(path.join(PRODUCTS_DIR, slug)).filter((f) => /\.png$/i.test(f)).sort();
      } catch {
        console.warn(`! missing folder: ${slug}`);
        continue;
      }

      for (const file of files) {
        const name = nameFromFile(file);
        const color = colorFromFile(file);
        const style = STYLES[globalIdx % STYLES.length];
        const featured = globalIdx % 7 === 0 ? 1 : 0; // ~6 featured spread across catalog
        const imageUrl = `/products/${slug}/${file}`;
        const sizes = sizesFor(meta.sizes);
        const stock = Object.values(sizes).reduce((a, b) => a + b, 0);
        const tags = name.toLowerCase().split(" ");

        await connection.execute(
          `INSERT INTO products (name, description, category, price, imageUrl, color, material, sizes, style, tags, stock, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            `${name} — premium ${meta.label.toLowerCase()} from HEIS KITS. Engineered for performance and built to last.`,
            slug,
            meta.price.toFixed(2),
            imageUrl,
            color,
            meta.material,
            JSON.stringify(sizes),
            style,
            JSON.stringify(tags),
            stock,
            featured,
          ]
        );
        count++;
        globalIdx++;
      }
      console.log(`  ${meta.label}: ${files.length}`);
    }

    console.log(`\n✓ Seeded ${count} products across ${Object.keys(CATEGORIES).length} categories`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

seed();
