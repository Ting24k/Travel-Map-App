import { test, expect, type Page } from '@playwright/test';
import { fixture, ids } from './api-fixture';
async function nav(page: Page, name: string) { await page.locator('nav:visible').getByRole('button', { name, exact: true }).click(); }
async function settings(page: Page) { await page.getByRole('button', { name: 'Account', exact: true }).click(); await page.getByRole('button', { name: 'Settings', exact: true }).click(); }
async function login(page: Page, email: string) { await page.goto('/'); await settings(page); await page.getByRole('textbox', { name: 'Email address' }).fill(email); await page.getByRole('button', { name: 'Send sign-in code' }).click(); await page.getByRole('textbox', { name: 'Email code' }).fill('123456'); await page.getByRole('button', { name: 'Verify & sign in' }).click(); await expect(page.locator('.account-identity')).toContainText(email); }
async function status(page: Page, query: string, value: string) { await nav(page, 'Map'); await page.getByRole('textbox', { name: 'Search places' }).fill(query); await page.locator('.search-results button').click(); await page.getByRole('combobox', { name: 'Travel status' }).selectOption(value); await page.getByRole('button', { name: 'Save & close' }).click(); }
test('two accounts, second device, migration, invitation, read-only comparison, private journals, offline sync and conflict recovery', async ({ page, context, browser }, info) => {
    const api = fixture();
    await api.install(context);
    const mobile = info.project.name === 'iphone-sized';
    const device = { baseURL: 'http://127.0.0.1:4182', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile };
    const cb = await browser.newContext(device), ca2 = await browser.newContext({ ...device, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await api.install(cb);
    await api.install(ca2);
    const b = await cb.newPage(), a2 = await ca2.newPage();
    try {
        await page.goto('/');
        await status(page, 'Spain', 'visited');
        await expect(page.locator('.app-footer')).toContainText('Saved on this device');
        await login(page, 'a@example.com');
        await page.getByRole('textbox', { name: 'Display name' }).fill('Alice');
        await expect.poll(() => api.users.get(ids.a)?.profile.display_name).toBe('Alice');
        await nav(page, 'Map');
        await expect(page.locator('[data-place-id="country:ESP"]')).toHaveAttribute('fill', '#dedfd5');
        await settings(page);
        await page.getByRole('button', { name: 'Preview local import' }).click();
        await expect(page.getByRole('dialog')).toContainText('Spain');
        await page.getByRole('button', { name: 'Confirm import' }).click();
        await expect.poll(() => api.users.get(ids.a)?.records.get('country:ESP')?.status).toBe('visited');
        await status(page, 'France', 'visited');
        await expect.poll(() => api.users.get(ids.a)?.records.get('country:FRA')?.status).toBe('visited');
        await login(a2, 'a@example.com');
        await nav(a2, 'Map');
        await expect(a2.locator('[data-place-id="country:FRA"]')).toHaveAttribute('fill', '#88a48b');
        await expect(a2.locator('[data-place-id="country:ESP"]')).toHaveAttribute('fill', '#88a48b');
        await login(b, 'b@example.com');
        await b.getByRole('textbox', { name: 'Display name' }).fill('Bob');
        await nav(b, 'Map');
        await expect(b.locator('[data-place-id="country:FRA"]')).toHaveAttribute('fill', '#dedfd5');
        await status(b, 'Japan', 'wishlist');
        await expect.poll(() => api.users.get(ids.b)?.records.get('country:JPN')?.status).toBe('wishlist');
        await nav(page, 'Friends');
        await page.getByRole('button', { name: 'Invite friend', exact: true }).click();
        const link = await page.getByRole('textbox', { name: 'Copy invitation link' }).inputValue();
        await b.goto(link);
        await expect(b.locator('.invitation-review')).toContainText('Alice');
        await b.getByRole('button', { name: 'Accept invitation', exact: true }).click();
        await expect.poll(() => api.connections.size).toBe(1);
        await nav(b, 'Map');
        await b.locator('.map-view-selector').getByRole('button', { name: 'Comparison', exact: true }).click();
        await expect(b.locator('[data-place-id="country:FRA"]')).toHaveAttribute('fill', '#d79555');
        await b.getByRole('textbox', { name: 'Search places' }).fill('France');
        await b.locator('.search-results button').click();
        await expect(b.getByRole('dialog').getByRole('checkbox')).toHaveCount(0);
        await expect(b.locator('.readonly-status')).toHaveCount(2);
        await b.locator('.modal-close').click();
        await b.locator('.map-view-selector').getByRole('button', { name: 'My map', exact: true }).click();
        await status(b, 'France', 'lived');
        await expect.poll(() => api.users.get(ids.b)?.records.get('country:FRA')?.status).toBe('lived');
        await nav(b, 'Friends');
        await b.getByRole('button', { name: 'Refresh', exact: true }).click();
        await nav(b, 'Map');
        await b.locator('.map-view-selector').getByRole('button', { name: 'Both visited', exact: true }).click();
        await expect(b.locator('[data-place-id="country:FRA"]')).toHaveAttribute('fill', '#9270ad');
        await expect(b.locator('[data-place-id="country:JPN"]')).toHaveAttribute('fill', '#dedfd5');
        await nav(page, 'Journal');
        await page.locator('.page-heading').getByRole('button', { name: 'Add a trip', exact: true }).click();
        await page.getByRole('dialog').getByRole('combobox', { name: 'Filter by place' }).selectOption('country:FRA');
        await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Private Alice memory');
        await page.getByRole('button', { name: 'Save trip', exact: true }).click();
        await expect.poll(() => api.users.get(ids.a)?.entries.size).toBe(1);
        await nav(b, 'Journal');
        await expect(b.locator('.journal-list article')).toHaveCount(0);
        await settings(a2);
        await a2.getByRole('button', { name: 'Refresh', exact: true }).click();
        await nav(a2, 'Journal');
        await expect(a2.locator('.journal-list')).toContainText('Private Alice memory');
        await a2.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller)
            await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })); });
        await ca2.setOffline(true);
        await status(a2, 'Japan', 'wishlist');
        await expect(a2.locator('.app-footer')).toContainText('waiting to sync');
        await a2.reload();
        await expect(a2.locator('[data-place-id="country:JPN"]')).toHaveAttribute('fill', '#d5ba79');
        await ca2.setOffline(false);
        await expect.poll(() => api.users.get(ids.a)?.records.get('country:JPN')?.status).toBe('wishlist');
        await ca2.setOffline(true);
        await status(a2, 'France', 'wishlist');
        await status(page, 'France', 'lived');
        await expect.poll(() => api.users.get(ids.a)?.records.get('country:FRA')?.status).toBe('lived');
        await ca2.setOffline(false);
        await settings(a2);
        await expect(a2.locator('.conflict-card')).toBeVisible();
        expect(api.users.get(ids.a)?.records.get('country:FRA')?.status).toBe('lived');
        await a2.getByRole('button', { name: 'Use cloud version' }).click();
        await expect(a2.locator('.conflict-card')).toHaveCount(0);
        await b.goto(link);
        await expect(b.getByRole('alert').first()).toContainText('unavailable');
        await nav(b, 'Friends');
        b.once('dialog', d => d.accept());
        await b.getByRole('button', { name: 'Disconnect', exact: true }).click();
        await expect.poll(() => api.connections.size).toBe(0);
        await nav(page, 'Friends');
        await page.getByRole('button', { name: 'Refresh', exact: true }).click();
        await expect(page.locator('.friend-list article')).toHaveCount(0);
        await nav(page, 'Map');
        await expect(page.locator('.map-view-selector').getByRole('button', { name: 'Friend’s map', exact: true })).toBeDisabled();
        await settings(a2);await a2.getByRole('button',{name:'Sign out',exact:true}).click();await expect(a2.locator('.account-identity')).toHaveCount(0);
        await login(a2,'b@example.com');await nav(a2,'Journal');await expect(a2.locator('.journal-list article')).toHaveCount(0);

    }
    finally {
        await cb.close();
        await ca2.close();
    }
});
