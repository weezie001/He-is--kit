// Promote (or demote) a user to admin by email so they can access /admin.
//
//   node --import tsx scripts/make-admin.mjs <email>            # make admin
//   node --import tsx scripts/make-admin.mjs <email> --demote   # back to user
//
// The store owner is auto-promoted on OAuth sign-in (OWNER_OPEN_ID in .env);
// this script is for granting admin to email/password accounts or for testing.

import dotenv from "dotenv";
dotenv.config({ override: true });
import mysql from "mysql2/promise";
import { buildMysqlPoolConfig } from "../server/_core/dbConfig.ts";

const email = process.argv[2];
const demote = process.argv.includes("--demote");
const role = demote ? "user" : "admin";

if (!email || email.startsWith("--")) {
  console.error("Usage: node --import tsx scripts/make-admin.mjs <email> [--demote]");
  process.exit(1);
}

const connection = await mysql.createConnection(buildMysqlPoolConfig(process.env.DATABASE_URL));
try {
  const [result] = await connection.execute(
    "UPDATE users SET role = ? WHERE email = ?",
    [role, email.toLowerCase().trim()],
  );
  if (result.affectedRows === 0) {
    console.error(`✗ No user found with email "${email}". Register/sign in first, then re-run.`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${email} is now ${role}. Sign out and back in for it to take effect.`);
  }
} catch (err) {
  console.error("Failed:", err.message || err);
  process.exitCode = 1;
} finally {
  await connection.end();
}
