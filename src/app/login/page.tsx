import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center p-5"><section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-7 shadow-sm"><p className="mb-2 text-sm font-bold tracking-widest text-[var(--purple)]">PURPLE NET</p><h1 className="mb-2 text-2xl font-bold">Sign in</h1><p className="mb-6 text-sm text-[var(--muted)]">Private recruiting workspace</p><LoginForm /></section></main>;
}
