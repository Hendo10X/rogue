import { asc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { tutorial } from "@/db/schema";

export type Tutorial = typeof tutorial.$inferSelect;

/** Published tutorials for customers, or everything for admins. Empty if not migrated. */
export async function listTutorials({ includeDrafts = false } = {}): Promise<Tutorial[]> {
  try {
    const q = db.select().from(tutorial);
    const rows = await (includeDrafts ? q : q.where(eq(tutorial.published, true))).orderBy(
      asc(tutorial.topic),
      asc(tutorial.sortOrder),
      asc(tutorial.createdAt),
    );
    return rows;
  } catch {
    return [];
  }
}
