import { eq } from "drizzle-orm";

import { hashPassword } from "../src/server/auth/password";
import { getDb } from "../src/server/db/client";
import { auditEvents, passwordCredentials, users } from "../src/server/db/schema";
import { getEnv } from "../src/server/env";
import { assertSafeDatabaseUrl } from "../src/server/security/database-guard";

const CONFIRMATION_FLAG = "--confirm";

async function main() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(`Password reset not run. Re-run with ${CONFIRMATION_FLAG} after updating ADMIN_PASSWORD.`);
  }

  const env = getEnv();
  assertSafeDatabaseUrl(env.DATABASE_URL, "Administrator password reset");

  const db = getDb();
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, env.ADMIN_EMAIL))
    .limit(1);

  if (!admin) {
    throw new Error(`No administrator account exists for ${env.ADMIN_EMAIL}. Run admin:setup first.`);
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordCredentials)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(passwordCredentials.userId, admin.id));
    await tx.insert(auditEvents).values({
      actorUserId: admin.id,
      eventType: "admin.password_reset",
      metadata: {},
    });
  });

  console.log("Administrator password reset.");
}

main().catch((error: unknown) => {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : undefined;
  const causeMessage = cause instanceof Error ? cause.message : undefined;
  const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database URL]") : "Unknown error";
  const detail = causeMessage && causeMessage !== message ? ` (${causeMessage})` : "";
  console.error(`Administrator password reset failed${code ? ` [${code}]` : ""}: ${message}${detail}`);
  process.exit(1);
});
