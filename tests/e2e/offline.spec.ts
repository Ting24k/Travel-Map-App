import { test, expect } from "@playwright/test";
test("installed service worker caches both maps and survives an offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-region")).toHaveCount(258);
  await page.getByRole("textbox", { name: "Search places" }).fill("France");
  await page.locator(".search-results button").click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save & close" }).click();
  await expect(page.locator(".app-footer")).toContainText(
    "Saved on this device",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-place-id="country:FRA"]')).toHaveAttribute(
    "fill",
    "#88a48b",
  );
  await expect(
    page.getByText("Offline · your maps and memories are here"),
  ).toBeVisible();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "China", exact: true })
    .click();
  await expect(page.locator(".map-region")).toHaveCount(34);
  await page.getByRole("textbox", { name: "Search places" }).fill("Macau");
  await page.locator(".search-results button").click();
  await expect(
    page.getByRole("dialog", { name: "Macau", exact: true }),
  ).toBeVisible();
});
test("touch layout has no horizontal overflow and navigation and dialog work with keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-region")).toHaveCount(258);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("textbox", { name: "Search places" }).fill("Monaco");
  await page.locator(".search-results button").press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("#travel-map>g")).not.toHaveAttribute(
    "transform",
    "translate(0,0) scale(1)",
  );
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await expect(page.locator("#travel-map>g")).toHaveAttribute(
    "transform",
    "translate(0,0) scale(1)",
  );
});
