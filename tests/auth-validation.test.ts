import { describe, expect, it } from "vitest";
import { loginSchema } from "@/server/auth/validation";
import { assertSafeDatabaseUrl } from "@/server/security/database-guard";
describe("authentication validation", () => {
  it("normalizes a valid login email", () => expect(loginSchema.parse({ email: " ADMIN@EXAMPLE.COM ", password: "secret" }).email).toBe("admin@example.com"));
  it("rejects malformed login input", () => expect(loginSchema.safeParse({ email: "no", password: "" }).success).toBe(false));
  it("refuses production-looking database targets", () => expect(() => assertSafeDatabaseUrl("postgresql://x:x@db.production.example.com/prod", "Test")).toThrow("refused"));
});
