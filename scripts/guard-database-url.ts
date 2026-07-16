import { assertSafeDatabaseUrl } from "../src/server/security/database-guard";
assertSafeDatabaseUrl(process.env.DATABASE_URL, "Database guard");
console.log("Database URL passed the production safety guard.");
