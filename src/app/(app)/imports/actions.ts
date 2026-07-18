"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { decideProposal } from "@/server/imports/review-service";
import { applyApprovedProposal } from "@/server/imports/review-service";
import { stageImport } from "@/server/imports/service";

function safeImportError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code.slice(0, 32) : undefined;
  const message = error instanceof Error ? error.message : "Unknown import error";
  return {
    code,
    message: message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]")
      .replace(/(password|token|secret)\s*=\s*\S+/gi, "$1=[redacted]")
      .slice(0, 500),
  };
}

export async function stageImportAction(formData: FormData) {
  let result: { batchId: string };
  try {
    const user = await requireUser(); const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose an XLSX or CSV file to stage.");
    result = await stageImport({ createdByUserId: user.id, filename: file.name, mimeType: file.type, contents: Buffer.from(await file.arrayBuffer()) });
  } catch (error) {
    console.error("import.stage.failed", safeImportError(error));
    redirect("/imports?error=stage_failed");
  }
  redirect(`/imports/${result.batchId}`);
}

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
