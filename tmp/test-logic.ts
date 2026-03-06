
import { sql } from "drizzle-orm";
import { db } from "../db/drizzle";
import { user } from "../db/schema";
import fetch from "node-fetch";

async function testCurrency() {
  console.log("Fetching exchange rate...");
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json() as any;
    console.log("Rate USD to NGN:", data.rates.NGN);
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  console.log("Fetching user count...");
  try {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(user);
    console.log("User count:", result.count);
  } catch (e) {
    console.error("DB query failed:", e);
  }
}

testCurrency();
