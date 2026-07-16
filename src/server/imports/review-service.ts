import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditEvents, importBatches, importProposals, importReviews } from "@/server/db/schema";

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
