"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/require-user";
import { applyApprovedProposals, approveCleanProposals, decideProposal } from "@/server/imports/review-service";
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

export async function approveCleanProposalsAction(formData: FormData) {
  const user = await requireUser();
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) throw new Error("Missing import batch.");
  await approveCleanProposals({ batchId, reviewerUserId: user.id });
  revalidatePath(`/imports/${batchId}`); revalidatePath("/imports");
}

export async function applyApprovedProposalsAction(formData: FormData) {
  const user = await requireUser();
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) throw new Error("Missing import batch.");
  await applyApprovedProposals({ batchId, actorUserId: user.id });
  revalidatePath(`/imports/${batchId}`); revalidatePath("/schools"); revalidatePath("/directors");
}
