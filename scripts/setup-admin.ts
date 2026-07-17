import { getDb } from "../src/server/db/client";
import { auditEvents, passwordCredentials, users } from "../src/server/db/schema";
import { getEnv } from "../src/server/env";
import { hashPassword } from "../src/server/auth/password";
import { assertSafeDatabaseUrl } from "../src/server/security/database-guard";
async function main() {
  const env = getEnv(); assertSafeDatabaseUrl(env.DATABASE_URL, "Administrator setup");
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const db = getDb(); const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) { console.log("Administrator already exists; no change made."); return; }
  await db.transaction(async (tx) => {
    const [admin] = await tx.insert(users).values({ email: env.ADMIN_EMAIL, role: "administrator" }).returning({ id: users.id });
    await tx.insert(passwordCredentials).values({ userId: admin.id, passwordHash });
    await tx.insert(auditEvents).values({ actorUserId: admin.id, eventType: "admin.seed_created", metadata: {} });
  });
  console.log("Administrator account created.");
}
main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
    ? String(error.cause.code)
    : undefined;
  const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database URL]") : "Unknown error";
  console.error(code ? `Administrator setup failed (${code}): ${message}` : `Administrator setup failed: ${message}`);
  process.exit(1);
});
