"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/require-user";
import { decideProposal } from "@/server/imports/review-service";
import { applyApprovedProposal } from "@/server/imports/review-service";

export async function applyProposalAction(formData: FormData) {
  const user = await requireUser(); const batchId = String(formData.get("batchId") ?? ""); const proposalId = String(formData.get("proposalId") ?? "");
  await applyApprovedProposal({ batchId, proposalId, actorUserId: user.id }); revalidatePath(`/imports/${batchId}`); revalidatePath("/schools"); revalidatePath("/directors");
}

export async function reviewProposalAction(formData: FormData) {
  const user = await requireUser();
  const batchId = String(formData.get("batchId") ?? ""); const proposalId = String(formData.get("proposalId") ?? ""); const decision = formData.get("decision");
  if (!batchId || !proposalId || (decision !== "approved" && decision !== "rejected")) throw new Error("Invalid review decision.");
  await decideProposal({ batchId, proposalId, reviewerUserId: user.id, decision, note: String(formData.get("note") ?? "") });
  revalidatePath(`/imports/${batchId}`); revalidatePath("/imports");
}
