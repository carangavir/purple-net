"use server";
import { getCurrentUser, destroySession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";
import { redirect } from "next/navigation";
export async function logoutAction() { const user = await getCurrentUser(); await destroySession(); if (user) await getDb().insert(auditEvents).values({ actorUserId: user.id, eventType: "auth.logout", metadata: {} }); redirect("/login"); }
