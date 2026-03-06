import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env" });

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
       console.warn("DATABASE_URL is not set.");
    }
  }
  
  dbInstance = drizzle(url || "postgres://localhost/postgres");
  return dbInstance;
}

export const db = getDb();
