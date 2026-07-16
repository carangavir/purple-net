import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { assertSafeDatabaseUrl } from "../src/server/security/database-guard";

async function main() {
  assertSafeDatabaseUrl(process.env.DATABASE_URL, "Migration");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS purple_net_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of (await readdir(join(process.cwd(), "drizzle"))).filter((file) => file.endsWith(".sql")).sort()) {
      const sql = await readFile(join(process.cwd(), "drizzle", name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = await client.query<{ checksum: string }>("SELECT checksum FROM purple_net_migrations WHERE name = $1", [name]);
      if (applied.rowCount) { if (applied.rows[0].checksum !== checksum) throw new Error(`Migration checksum changed: ${name}`); continue; }
      await client.query("BEGIN");
      try { await client.query(sql); await client.query("INSERT INTO purple_net_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]); await client.query("COMMIT"); }
      catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally { await client.end(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Migration failed"); process.exit(1); });
