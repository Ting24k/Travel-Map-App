import { test, expect } from "@playwright/test";
test("real world and China polygons can be selected", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".map-region")).toHaveCount(258);
  await page.locator('[data-place-id="country:IDN"]').press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Indonesia", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save & close" }).click();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "China", exact: true })
    .click();
  await expect(page.locator(".map-region")).toHaveCount(34);
  await page.locator('[data-place-id="province:CN-BJ"]').press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Beijing", exact: true }),
  ).toBeVisible();
});
