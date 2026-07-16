"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
const initialState: LoginState = {};
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return <form action={formAction} className="grid gap-5" noValidate>
    <div className="grid gap-2"><label htmlFor="email" className="text-sm font-semibold">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="rounded-md border border-[var(--border)] px-3 py-2" /></div>
    <div className="grid gap-2"><label htmlFor="password" className="text-sm font-semibold">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="rounded-md border border-[var(--border)] px-3 py-2" /></div>
    {state.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
    <button disabled={pending} className="rounded-md bg-[var(--purple)] px-4 py-2 font-semibold text-white enabled:hover:bg-[var(--purple-dark)] disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
