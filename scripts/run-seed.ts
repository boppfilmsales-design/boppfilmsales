import { db } from "@/db/index";
import { ensureSeedData } from "@/db/seed";
import { newsCategories, newsPosts, adminUsers } from "@/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding database...");
  await ensureSeedData();
  const [{ catCount }] = await db.select({ catCount: sql<number>`count(*)::int` }).from(newsCategories);
  const [{ postCount }] = await db.select({ postCount: sql<number>`count(*)::int` }).from(newsPosts);
  const [{ userCount }] = await db.select({ userCount: sql<number>`count(*)::int` }).from(adminUsers);
  console.log(`Database seeded successfully!`);
  console.log(`Categories: ${catCount}`);
  console.log(`Posts: ${postCount}`);
  console.log(`Admin Users: ${userCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
