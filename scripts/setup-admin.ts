import { getDb } from "../src/server/db/client";
import { auditEvents, passwordCredentials, users } from "../src/server/db/schema";
import { getEnv } from "../src/server/env";
import { hashPassword } from "../src/server/auth/password";
import { assertSafeDatabaseUrl } from "../src/server/security/database-guard";
async function main() {
  const env = getEnv(); assertSafeDatabaseUrl(env.DATABASE_URL, "Administrator setup");
  const db = getDb(); const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) { console.log("Administrator already exists; no change made."); return; }
  const [admin] = await db.insert(users).values({ email: env.ADMIN_EMAIL, role: "administrator" }).returning({ id: users.id });
  await db.insert(passwordCredentials).values({ userId: admin.id, passwordHash: await hashPassword(env.ADMIN_PASSWORD) });
  await db.insert(auditEvents).values({ actorUserId: admin.id, eventType: "admin.seed_created", metadata: {} });
  console.log("Administrator account created.");
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Administrator setup failed"); process.exit(1); });
