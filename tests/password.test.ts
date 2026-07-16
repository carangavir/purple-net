import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
describe("password hashing", () => {
  it("stores an Argon2id-compatible hash and verifies only the correct password", async () => {
    const hash = await hashPassword("test-password-that-is-not-an-admin-secret");
    expect(hash).not.toContain("test-password-that-is-not-an-admin-secret");
    expect(await verifyPassword(hash, "test-password-that-is-not-an-admin-secret")).toBe(true);
    expect(await verifyPassword(hash, "incorrect-password")).toBe(false);
  });
});
