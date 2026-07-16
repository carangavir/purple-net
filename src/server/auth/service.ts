import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditEvents, loginAttempts, passwordCredentials, users } from "@/server/db/schema";
import { verifyPassword } from "./password";
import type { LoginInput } from "./validation";

export const INVALID_LOGIN_MESSAGE = "Invalid email or password.";
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

async function recordFailure(email: string, userId?: string) {
  const db = getDb();
  await db.insert(loginAttempts).values({ email, succeeded: false });
  const attempts = await db.select().from(loginAttempts).where(and(eq(loginAttempts.email, email), eq(loginAttempts.succeeded, false), gte(loginAttempts.attemptedAt, new Date(Date.now() - WINDOW_MS)))).orderBy(desc(loginAttempts.attemptedAt));
  const locked = attempts.length >= MAX_FAILURES && userId;
  if (locked) {
    await db.update(users).set({ lockedUntil: new Date(Date.now() + LOCKOUT_MS), updatedAt: new Date() }).where(eq(users.id, userId));
    await db.insert(auditEvents).values({ actorUserId: userId, eventType: "account.locked", metadata: { reason: "failed_login_threshold" } });
  }
  await db.insert(auditEvents).values({ actorUserId: userId, eventType: "auth.login_failed", metadata: {} });
}

export async function authenticate(input: LoginInput): Promise<{ userId: string } | { error: string }> {
  const db = getDb();
  const result = await db.select({ user: users, credential: passwordCredentials }).from(users).leftJoin(passwordCredentials, eq(passwordCredentials.userId, users.id)).where(eq(users.email, input.email)).limit(1);
  const found = result[0];
  const now = new Date();
  if (!found || !found.user.isActive || (found.user.lockedUntil && found.user.lockedUntil > now) || !found.credential || !(await verifyPassword(found.credential.passwordHash, input.password))) {
    await recordFailure(input.email, found?.user.id);
    return { error: INVALID_LOGIN_MESSAGE };
  }
  await db.insert(loginAttempts).values({ email: input.email, succeeded: true });
  await db.insert(auditEvents).values({ actorUserId: found.user.id, eventType: "auth.login_succeeded", metadata: {} });
  return { userId: found.user.id };
}
