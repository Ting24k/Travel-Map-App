import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function settings(page:import('@playwright/test').Page){await page.getByRole('button',{name:'Account',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click()}
test("backup download, cancellation, replacement, malformed file, and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search places" }).fill("France");
  await page.locator(".search-results button").click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save & close" }).click();
  await expect(page.locator(".app-footer")).toContainText(
    "Saved on this device",
  );
  await settings(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup.schemaVersion).toBe(1);
  expect(backup.visits[0].placeId).toBe("country:FRA");
  await page
    .getByTestId("backup-file")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await expect(page.getByRole("alert")).toContainText("invalid");
  const cleared = { ...backup, visits: [], appearances: [] };
  const file = {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(cleared)),
  };
  await page.getByTestId("backup-file").setInputFiles(file);
  await expect(page.getByRole("dialog")).toContainText(
    "Replace all travel records",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Export backup" }).click();
  await page.getByTestId("backup-file").setInputFiles(file);
  await page.getByRole("button", { name: "Replace my data" }).click();
  await expect(page.getByRole("status")).toContainText("restored");
  await expect(page.locator(".app-footer")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator('[data-place-id="country:FRA"]')).toHaveAttribute(
    "fill",
    "#dedfd5",
  );
  await settings(page);
  await page
    .getByTestId("backup-file")
    .setInputFiles({
      name: "original.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.getByRole("button", { name: "Replace my data" }).click();
  await expect(page.locator(".app-footer")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator('[data-place-id="country:FRA"]')).toHaveAttribute(
    "fill",
    "#88a48b",
  );
});
test("exports a real PNG with a mobile-friendly preview and download", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-region")).toHaveCount(258);
  await page.getByRole("button", { name: /Export map/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Map image", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Map image" })).toBeVisible();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const download = await promise;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.readUInt32BE(16)).toBe(2000);
  expect(bytes.readUInt32BE(20)).toBe(1600);
  expect(bytes.length).toBeGreaterThan(30000);
});
