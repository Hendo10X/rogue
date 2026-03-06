import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env" });

const url = process.env.DATABASE_URL;

if (!url && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not set. Database connection may fail if this module is evaluated during build.");
}

export const db = drizzle(url || "postgres://localhost/postgres");
