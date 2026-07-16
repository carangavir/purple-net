import { requireUser } from "@/server/auth/require-user";
import { AppNav } from "@/components/app-nav";
import { logoutAction } from "./actions";
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return <div className="min-h-screen"><header className="bg-[var(--purple-dark)] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><div><p className="text-lg font-bold">Purple Net</p><p className="text-xs text-white/70">Private recruiting CRM</p></div><form action={logoutAction}><button className="rounded border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10" aria-label={`Sign out ${user.email}`}>Sign out</button></form></div><AppNav /></header><main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main></div>;
}
