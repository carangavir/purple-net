import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
async function main() {
  const files = (await readdir(join(process.cwd(), "drizzle"))).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();
  if (!files.length) throw new Error("No SQL migrations found.");
  for (const file of files) { const content = await readFile(join(process.cwd(), "drizzle", file), "utf8"); if (!content.trim() || !/CREATE TABLE/.test(content)) throw new Error(`Invalid migration: ${file}`); }
  console.log(`Validated ${files.length} explicit SQL migration(s).`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Migration validation failed"); process.exit(1); });
