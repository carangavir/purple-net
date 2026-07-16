import { test, expect } from "@playwright/test";
const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.ADMIN_PASSWORD ?? "test-only-not-a-real-password";
test("login, navigation, responsive shell, and logout", async ({ page }) => {
  await page.goto("/dashboard"); await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill(password); await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/); await page.getByRole("link", { name: "Schools" }).click(); await expect(page.getByRole("heading", { name: "Schools" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 667 }); await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await page.getByRole("button", { name: /Sign out/ }).click(); await expect(page).toHaveURL(/\/login$/); await page.goto("/dashboard"); await expect(page).toHaveURL(/\/login$/);
});
