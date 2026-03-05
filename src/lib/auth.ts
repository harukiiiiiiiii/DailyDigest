/**
 * Better Auth — server-side auth instance.
 * Uses SQLite via better-sqlite3 directly (Better Auth's built-in adapter).
 */
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "digest.db");

export const auth = betterAuth({
  database: new Database(DB_PATH),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
  ],
});
