import { defineConfig } from "drizzle-kit";
import "dotenv/config";
import { buildMysqlPoolConfig } from "./server/_core/dbConfig";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const { host, port, user, password, database, ssl } = buildMysqlPoolConfig(connectionString);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: host!,
    port,
    user,
    password,
    database: database!,
    ssl: ssl as any,
  },
});
