import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { auditEvents, tasks } from "@/server/db/schema";
const priorities = ["urgent", "high", "normal", "low"] as const; const statuses = ["open", "in_progress", "waiting", "completed", "dismissed", "canceled"] as const;
const taskSchema = z.object({ title: z.string().trim().min(2), dueAt: z.string().optional(), priority: z.enum(priorities).default("normal") });
export async function createTask(input: unknown, userId: string) { const data = taskSchema.parse(input); const [task] = await getDb().insert(tasks).values({ title: data.title, dueAt: data.dueAt ? new Date(data.dueAt) : null, priority: data.priority }).returning(); await getDb().insert(auditEvents).values({ actorUserId: userId, eventType: "task.created", metadata: { taskId: task.id } }); return task; }
export async function listTasks() { return getDb().select().from(tasks).where(inArray(tasks.status, ["open", "in_progress", "waiting"])).orderBy(asc(tasks.dueAt)); }
export async function completeTask(id: string, userId: string) { await getDb().transaction(async (tx) => { await tx.update(tasks).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, id)); await tx.insert(auditEvents).values({ actorUserId: userId, eventType: "task.completed", metadata: { taskId: id } }); }); }
export async function dashboardTasks() { const all = await listTasks(); const now = new Date(); const today = now.toISOString().slice(0, 10); return { overdue: all.filter((task) => task.dueAt && task.dueAt < now), today: all.filter((task) => task.dueAt?.toISOString().slice(0, 10) === today), upcoming: all.filter((task) => !task.dueAt || task.dueAt > now) }; }
export { priorities, statuses };
