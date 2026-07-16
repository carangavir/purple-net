"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/require-user";
import { createSchool, setArchived } from "@/server/crm/service";
export async function createSchoolAction(formData: FormData) { const user = await requireUser(); await createSchool({ name: formData.get("name"), metro: formData.get("metro") || undefined, district: formData.get("district") || undefined, uilConference: formData.get("uilConference") || undefined, priorityTier: formData.get("priorityTier") || undefined }, user.id); revalidatePath("/schools"); }
export async function archiveSchoolAction(formData: FormData) { const user = await requireUser(); const id = String(formData.get("id")); const archived = formData.get("archived") === "true"; await setArchived("school", id, archived, user.id); revalidatePath("/schools"); revalidatePath(`/schools/${id}`); }
