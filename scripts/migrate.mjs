import fs from "fs";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

const migration = fs.readFileSync("./drizzle/0000_rainy_the_fallen.sql", "utf8");
const statements = migration
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  try {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.substring(0, 70) + "...");
  } catch (e) {
    console.error("ERR:", e.message.substring(0, 100));
  }
}

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
console.log("\nTables created:", tables.map((t) => t.tablename).join(", "));

await sql.end();
