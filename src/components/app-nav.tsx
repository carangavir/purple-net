"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = ["Dashboard", "Prospects", "Schools", "Directors", "Visits", "Campaigns", "Tasks", "Reports", "Imports", "Templates", "Settings"];
const href = (item: string) => `/${item.toLowerCase()}`;
export function AppNav() { const path = usePathname(); return <nav aria-label="Primary navigation" className="overflow-x-auto border-b border-white/15 bg-[var(--purple-dark)]"><ul className="mx-auto flex max-w-7xl min-w-max gap-1 px-4 py-2">{links.map((item) => <li key={item}><Link href={href(item)} className={`block rounded px-3 py-2 text-sm font-medium ${path === href(item) ? "bg-[var(--purple)] text-white shadow-sm ring-1 ring-white/40" : "text-white hover:bg-white/15"}`}>{item}</Link></li>)}</ul></nav>; }
