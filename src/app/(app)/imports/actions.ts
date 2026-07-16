"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { decideProposal } from "@/server/imports/review-service";
import { stageImport } from "@/server/imports/service";

export async function stageImportAction(formData: FormData) {
  const user = await requireUser(); const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Choose an XLSX or CSV file to stage.");
  const result = await stageImport({ createdByUserId: user.id, filename: file.name, mimeType: file.type, contents: Buffer.from(await file.arrayBuffer()) });
  redirect(`/imports/${result.batchId}`);
}

export async function reviewProposalAction(formData: FormData) {
  const user = await requireUser();
  const batchId = String(formData.get("batchId") ?? ""); const proposalId = String(formData.get("proposalId") ?? ""); const decision = formData.get("decision");
  if (!batchId || !proposalId || (decision !== "approved" && decision !== "rejected")) throw new Error("Invalid review decision.");
  await decideProposal({ batchId, proposalId, reviewerUserId: user.id, decision, note: String(formData.get("note") ?? "") });
  revalidatePath(`/imports/${batchId}`); revalidatePath("/imports");
}
