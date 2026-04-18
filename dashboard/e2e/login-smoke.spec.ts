import { expect, test } from "@playwright/test";

test.describe("Login (smoke)", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign in").first()).toBeVisible();
    await expect(
      page.getByText("Enter your credentials to access your account")
    ).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign in/i })
    ).toBeVisible();
  });
});
