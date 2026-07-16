import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getEnv } from "@/server/env";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";

export const SESSION_COOKIE = "purple_net_session";
const SESSION_DAYS = 7;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const expiry = () => new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiry();
  await getDb().insert(sessions).values({ userId, tokenHash: tokenHash(token), expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: getEnv().NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: getEnv().NODE_ENV === "production", expires: new Date(0), path: "/" });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await getDb().select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date()), eq(users.isActive, true))).limit(1);
  if (!rows[0]) return null;
  return rows[0].user;
}
