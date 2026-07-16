import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/server/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };
export function getDb() {
  const pool = globalForDb.pool ?? new Pool({ connectionString: getEnv().DATABASE_URL, max: 5 });
  if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
  return drizzle(pool, { schema });
}
