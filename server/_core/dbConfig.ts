// Builds a mysql2 pool/connection config from a DATABASE_URL.
//
// Aiven (and most managed MySQL hosts) require TLS. The `?ssl-mode=REQUIRED`
// query param in the URL is a MySQL CLI flag — the mysql2 driver does not
// understand it, so we parse the URL ourselves and pass an explicit `ssl`
// option instead.
import type { PoolOptions } from "mysql2/promise";

export function buildMysqlPoolConfig(databaseUrl: string): PoolOptions {
  const url = new URL(databaseUrl);

  // Whether the host asks for TLS (Aiven URLs carry ssl-mode=REQUIRED).
  const sslMode = url.searchParams.get("ssl-mode");
  const needsSsl =
    sslMode === "REQUIRED" ||
    url.searchParams.has("ssl") ||
    url.hostname.endsWith("aivencloud.com");

  const config: PoolOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };

  if (needsSsl) {
    // rejectUnauthorized:false avoids needing to ship the provider CA cert for
    // local/dev seeding. For production, supply the CA via the `ssl.ca` option.
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}
