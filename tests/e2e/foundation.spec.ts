import { test, expect } from "@playwright/test";
test("application shell and PWA manifest are served", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Our Little World" }),
  ).toBeVisible();
  expect((await request.get("/manifest.webmanifest")).ok()).toBeTruthy();
});
