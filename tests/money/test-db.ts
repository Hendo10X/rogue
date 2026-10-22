// Test-only stand-in for db/drizzle.ts (wired in by tests/money/tsconfig.json): the same drizzle API on an in-process Postgres.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

export const client = new PGlite();
export const db = drizzle(client);
export function getDb() {
  return db;
}
