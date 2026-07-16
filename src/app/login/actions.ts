"use server";
import { redirect } from "next/navigation";
import { authenticate, INVALID_LOGIN_MESSAGE } from "@/server/auth/service";
import { createSession, getCurrentUser } from "@/server/auth/session";
import { loginSchema } from "@/server/auth/validation";
export type LoginState = { error?: string };
export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  if (await getCurrentUser()) redirect("/dashboard");
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: INVALID_LOGIN_MESSAGE };
  const result = await authenticate(parsed.data);
  if ("error" in result) return { error: result.error };
  await createSession(result.userId);
  redirect("/dashboard");
}
