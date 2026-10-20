import { test, expect } from "@playwright/test";
test("search a small country, save a visit and color, reload, and unmark it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search places" }).fill("Vatican");
  await page.locator(".search-results button").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Vatican");
  await sheet.getByRole("checkbox").check();
  await sheet.getByRole("button", { name: "Color #d69b85" }).click();
  await expect(page.locator('[data-place-id="country:VAT"]')).toHaveAttribute(
    "fill",
    "#d69b85",
  );
  await sheet.getByRole("button", { name: "Save & close" }).click();
  await expect(page.locator(".app-footer")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator('[data-place-id="country:VAT"]')).toHaveAttribute(
    "fill",
    "#d69b85",
  );
  await page.getByRole("textbox", { name: "Search places" }).fill("Vatican");
  await page.locator(".search-results button").click();
  await sheet.getByRole("checkbox").uncheck();
  await expect(page.locator('[data-place-id="country:VAT"]')).toHaveAttribute(
    "fill",
    "#dedfd5",
  );
});
test("Chinese search and a province derive China without marking every province", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(
    page
      .locator(".segmented")
      .getByRole("button", { name: "中国", exact: true }),
  ).toBeVisible();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "中国", exact: true })
    .click();
  await page.getByRole("textbox", { name: "搜索地点" }).fill("北京");
  await page.locator(".search-results button").click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "保存并关闭" }).click();
  await expect(page.locator(".map-progress")).toContainText("1");
  await page.getByRole("button", { name: "世界", exact: true }).click();
  await expect(page.locator('[data-place-id="country:CHN"]')).toHaveAttribute(
    "fill",
    "#88a48b",
  );
  await page.getByRole("textbox", { name: "搜索地点" }).fill("中国");
  await page.locator(".search-results button").click();
  await expect(
    page.getByRole("dialog").getByRole("checkbox"),
  ).not.toBeChecked();
  await expect(page.locator(".derived-note")).toBeVisible();
});
