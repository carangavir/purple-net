import "server-only";
import { and, asc, eq, isNull, like } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditEvents, directorContactMethods, directorEmployments, directors, districts, metros, schoolContactMethods, schoolVerifications, schools } from "@/server/db/schema";
import { directorSchema, normaliseName, schoolSchema } from "./validation";

async function namedRecord(tx: ReturnType<typeof getDb>, table: typeof metros | typeof districts, name?: string) {
  if (!name) return null; const normalizedName = normaliseName(name);
  await tx.insert(table).values({ name, normalizedName }).onConflictDoNothing();
  const [row] = await tx.select().from(table).where(eq(table.normalizedName, normalizedName)).limit(1); return row?.id ?? null;
}

export async function createSchool(input: unknown, actorUserId: string) {
  const values = schoolSchema.parse(input); const db = getDb();
  return db.transaction(async (tx) => {
    const normalizedName = normaliseName(values.name); const [existing] = await tx.select({ id: schools.id }).from(schools).where(and(eq(schools.normalizedName, normalizedName), isNull(schools.archivedAt))).limit(1);
    if (existing) throw new Error("A live school with this name already exists; review it instead of merging automatically.");
    const database = tx as unknown as ReturnType<typeof getDb>;
    const metroId = await namedRecord(database, metros, values.metro); const districtId = await namedRecord(database, districts, values.district);
    const [school] = await tx.insert(schools).values({ name: values.name, normalizedName, metroId, districtId, uilConference: values.uilConference || null, priorityTier: values.priorityTier || null }).returning();
    await tx.insert(auditEvents).values({ actorUserId, eventType: "school.created", metadata: { schoolId: school.id } }); return school;
  });
}

export async function createDirector(input: unknown, actorUserId: string) {
  const values = directorSchema.parse(input); const db = getDb();
  return db.transaction(async (tx) => {
    const [school] = await tx.select({ id: schools.id }).from(schools).where(and(eq(schools.id, values.schoolId), isNull(schools.archivedAt))).limit(1); if (!school) throw new Error("Choose an active school.");
    const normalizedName = normaliseName(values.legalName); const duplicate = await tx.select({ id: directors.id }).from(directors).innerJoin(directorEmployments, eq(directorEmployments.directorId, directors.id)).where(and(eq(directors.normalizedName, normalizedName), eq(directorEmployments.schoolId, school.id), eq(directorEmployments.isCurrent, true), isNull(directors.archivedAt))).limit(1);
    if (duplicate[0]) throw new Error("A current director with this name is already associated with this school.");
    const [director] = await tx.insert(directors).values({ legalName: values.legalName, normalizedName, preferredName: values.preferredName || null, currentTitle: values.title || null }).returning();
    await tx.insert(directorEmployments).values({ directorId: director.id, schoolId: school.id, title: values.title || null, isCurrent: true });
    if (values.email) await tx.insert(directorContactMethods).values({ directorId: director.id, type: "email", value: values.email, isPrimary: true }); if (values.phone) await tx.insert(directorContactMethods).values({ directorId: director.id, type: "phone", value: values.phone });
    await tx.insert(auditEvents).values({ actorUserId, eventType: "director.created", metadata: { directorId: director.id, schoolId: school.id } }); return director;
  });
}

export async function setArchived(entity: "school" | "director", id: string, archived: boolean, actorUserId: string) {
  const table = entity === "school" ? schools : directors; await getDb().transaction(async (tx) => { await tx.update(table).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(table.id, id)); await tx.insert(auditEvents).values({ actorUserId, eventType: `${entity}.${archived ? "archived" : "restored"}`, metadata: { id } }); });
}

export async function listSchools(query = "", includeArchived = false) { const conditions = [includeArchived ? undefined : isNull(schools.archivedAt), query ? like(schools.normalizedName, `%${normaliseName(query)}%`) : undefined].filter(Boolean); return getDb().select({ school: schools, metro: metros, district: districts }).from(schools).leftJoin(metros, eq(schools.metroId, metros.id)).leftJoin(districts, eq(schools.districtId, districts.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(schools.name)); }
export async function listDirectors(query = "", includeArchived = false) { const conditions = [includeArchived ? undefined : isNull(directors.archivedAt), query ? like(directors.normalizedName, `%${normaliseName(query)}%`) : undefined].filter(Boolean); return getDb().select({ director: directors, employment: directorEmployments, school: schools }).from(directors).leftJoin(directorEmployments, and(eq(directorEmployments.directorId, directors.id), eq(directorEmployments.isCurrent, true))).leftJoin(schools, eq(directorEmployments.schoolId, schools.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(directors.legalName)); }

export async function getSchool(id: string) { const db = getDb(); const [school] = await db.select({ school: schools, metro: metros, district: districts }).from(schools).leftJoin(metros, eq(schools.metroId, metros.id)).leftJoin(districts, eq(schools.districtId, districts.id)).where(eq(schools.id, id)).limit(1); if (!school) return null; return { ...school, contacts: await db.select().from(schoolContactMethods).where(eq(schoolContactMethods.schoolId, id)), verifications: await db.select().from(schoolVerifications).where(eq(schoolVerifications.schoolId, id)), employments: await db.select({ employment: directorEmployments, director: directors }).from(directorEmployments).innerJoin(directors, eq(directorEmployments.directorId, directors.id)).where(eq(directorEmployments.schoolId, id)) }; }
export async function getDirector(id: string) { const db = getDb(); const [director] = await db.select().from(directors).where(eq(directors.id, id)).limit(1); if (!director) return null; return { director, contacts: await db.select().from(directorContactMethods).where(eq(directorContactMethods.directorId, id)), employments: await db.select({ employment: directorEmployments, school: schools }).from(directorEmployments).innerJoin(schools, eq(directorEmployments.schoolId, schools.id)).where(eq(directorEmployments.directorId, id)) }; }
