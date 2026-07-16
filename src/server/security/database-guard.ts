import { URL } from "node:url";

export function assertSafeDatabaseUrl(value: string | undefined, operation: string) {
  if (!value) throw new Error(`${operation} requires DATABASE_URL.`);
  const parsed = new URL(value);
  const signal = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  if (/(^|[-_.])prod(uction)?([-_.]|$)/.test(signal)) {
    throw new Error(`${operation} refused: DATABASE_URL appears to target production.`);
  }
}
