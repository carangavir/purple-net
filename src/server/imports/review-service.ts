import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { auditEvents, directorContactMethods, directorEmployments, directors, districts, importBatches, importFieldProvenance, importProposals, importReviews, metros, schoolAddresses, schoolContactMethods, schoolVerifications, schools } from "@/server/db/schema";
import { normaliseName } from "@/server/crm/validation";

export async function getImportBatch(batchId: string) {
  const db = getDb();
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!batch) return null;
  const proposals = await db.select().from(importProposals).where(eq(importProposals.batchId, batchId)).orderBy(asc(importProposals.createdAt));
  return { batch, proposals };
}

export async function decideProposal(input: { batchId: string; proposalId: string; reviewerUserId: string; decision: "approved" | "rejected"; note?: string }) {
  return getDb().transaction(async (tx) => {
    const [proposal] = await tx.select().from(importProposals).where(and(eq(importProposals.id, input.proposalId), eq(importProposals.batchId, input.batchId))).limit(1);
    if (!proposal || proposal.status !== "pending") throw new Error("This import proposal is no longer available for review.");
    await tx.update(importProposals).set({ status: input.decision, decidedAt: new Date() }).where(eq(importProposals.id, proposal.id));
    await tx.insert(importReviews).values({ proposalId: proposal.id, reviewerUserId: input.reviewerUserId, decision: input.decision, note: input.note?.trim() || null });
    // Phase 2 deliberately ends here: reviewed proposals are never applied to live records.
    await tx.insert(auditEvents).values({ actorUserId: input.reviewerUserId, eventType: `import.proposal_${input.decision}`, metadata: { batchId: input.batchId, proposalId: proposal.id, entityType: proposal.entityType } });
  });
}

/** Approves only new, conflict-free records. Conflicts stay pending for manual review. */
export async function approveCleanProposals(input: { batchId: string; reviewerUserId: string }) {
  return getDb().transaction(async (tx) => {
    const approved = await tx.update(importProposals).set({ status: "approved", decidedAt: new Date() }).where(and(
      eq(importProposals.batchId, input.batchId),
      eq(importProposals.status, "pending"),
      eq(importProposals.proposedAction, "create"),
    )).returning({ id: importProposals.id });
    if (!approved.length) return 0;
    await tx.insert(importReviews).values(approved.map((proposal) => ({ proposalId: proposal.id, reviewerUserId: input.reviewerUserId, decision: "approved", note: "Bulk-approved as a conflict-free create proposal." })));
    await tx.insert(auditEvents).values({ actorUserId: input.reviewerUserId, eventType: "import.clean_proposals_bulk_approved", metadata: { batchId: input.batchId, count: approved.length } });
    return approved.length;
  });
}

const schoolPayload = z.object({ proposed: z.object({ name: z.string().min(1), metro: z.string(), district: z.string(), uilConference: z.string(), phone: z.string(), address: z.string(), city: z.string(), zip: z.string(), website: z.string(), tier: z.string() }), source: z.record(z.string(), z.unknown()) });
const directorPayload = z.object({ proposed: z.object({ name: z.string().min(1), school: z.string().min(1), email: z.string(), phone: z.string(), verificationNote: z.string(), tier: z.string(), outreachNotes: z.string() }), source: z.record(z.string(), z.unknown()) });

export async function applyApprovedProposal(input: { batchId: string; proposalId: string; actorUserId: string }) {
  return getDb().transaction(async (tx) => {
    const [proposal] = await tx.select().from(importProposals).where(and(eq(importProposals.id, input.proposalId), eq(importProposals.batchId, input.batchId))).limit(1);
    if (!proposal || proposal.status !== "approved" || proposal.proposedAction !== "create") throw new Error("Only approved create proposals can be applied.");
    let entityType: "school" | "director"; let entityId: string; const fields: string[] = [];
    if (proposal.entityType === "school") {
      const data = schoolPayload.parse(proposal.payload).proposed; const normalizedName = normaliseName(data.name);
      const [existing] = await tx.select({ id: schools.id }).from(schools).where(eq(schools.normalizedName, normalizedName)).limit(1); if (existing) throw new Error("A matching school already exists. Resolve the duplicate manually; no automatic merge occurred.");
      let metroId: string | null = null; let districtId: string | null = null;
      if (data.metro) { const key = normaliseName(data.metro); await tx.insert(metros).values({ name: data.metro, normalizedName: key }).onConflictDoNothing(); metroId = (await tx.select({ id: metros.id }).from(metros).where(eq(metros.normalizedName, key)).limit(1))[0]?.id ?? null; }
      if (data.district) { const key = normaliseName(data.district); await tx.insert(districts).values({ name: data.district, normalizedName: key }).onConflictDoNothing(); districtId = (await tx.select({ id: districts.id }).from(districts).where(eq(districts.normalizedName, key)).limit(1))[0]?.id ?? null; }
      const [school] = await tx.insert(schools).values({ name: data.name, normalizedName, metroId, districtId, uilConference: data.uilConference || null, priorityTier: data.tier || null }).returning({ id: schools.id }); entityType = "school"; entityId = school.id; fields.push("schools.name", "schools.metro", "schools.district", "schools.uil_conference", "schools.priority_tier");
      if (data.address) { await tx.insert(schoolAddresses).values({ schoolId: school.id, line1: data.address, city: data.city || null, postalCode: data.zip || null }); fields.push("school_addresses.line1", "school_addresses.city", "school_addresses.postal_code"); }
      if (data.phone) { await tx.insert(schoolContactMethods).values({ schoolId: school.id, type: "phone", value: data.phone, isPrimary: true }); fields.push("school_contact_methods.phone"); }
      if (data.website) { await tx.insert(schoolContactMethods).values({ schoolId: school.id, type: "website", value: data.website }); fields.push("school_contact_methods.website"); }
      if (data.tier) { await tx.insert(schoolVerifications).values({ schoolId: school.id, status: data.tier, source: "Phase 2 import" }); fields.push("school_verifications.status"); }
    } else if (proposal.entityType === "director") {
      const data = directorPayload.parse(proposal.payload).proposed; const normalizedName = normaliseName(data.name); const [school] = await tx.select({ id: schools.id }).from(schools).where(and(eq(schools.normalizedName, normaliseName(data.school)), isNull(schools.archivedAt))).limit(1); if (!school) throw new Error("Apply the matching school proposal first, then apply this director.");
      const duplicate = await tx.select({ id: directors.id }).from(directors).innerJoin(directorEmployments, eq(directorEmployments.directorId, directors.id)).where(and(eq(directors.normalizedName, normalizedName), eq(directorEmployments.schoolId, school.id), eq(directorEmployments.isCurrent, true))).limit(1); if (duplicate[0]) throw new Error("A matching director employment already exists. Resolve it manually; no automatic merge occurred.");
      const [director] = await tx.insert(directors).values({ legalName: data.name, normalizedName }).returning({ id: directors.id }); await tx.insert(directorEmployments).values({ directorId: director.id, schoolId: school.id, isCurrent: true, verificationStatus: data.tier || null, source: "Phase 2 import", notes: data.outreachNotes || null }); entityType = "director"; entityId = director.id; fields.push("directors.legal_name", "director_employments.school_id");
      if (data.email) { await tx.insert(directorContactMethods).values({ directorId: director.id, type: "email", value: data.email, isPrimary: true }); fields.push("director_contact_methods.email"); } if (data.phone) { await tx.insert(directorContactMethods).values({ directorId: director.id, type: "phone", value: data.phone }); fields.push("director_contact_methods.phone"); }
    } else throw new Error("Unresolved and conflict proposals cannot be applied.");
    await tx.insert(importFieldProvenance).values(fields.map((fieldName) => ({ proposalId: proposal.id, entityType, entityId, fieldName })));
    await tx.update(importProposals).set({ status: "applied", decidedAt: new Date() }).where(eq(importProposals.id, proposal.id));
    await tx.insert(auditEvents).values({ actorUserId: input.actorUserId, eventType: "import.proposal_applied", metadata: { batchId: input.batchId, proposalId: proposal.id, entityType, entityId } });
    return { entityType, entityId };
  });
}
