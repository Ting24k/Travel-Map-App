import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testDir: 'tests/cloud', timeout: 120000, use: { ...base.use, actionTimeout: 10000, baseURL: 'http://127.0.0.1:4182' }, webServer: { command: 'VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_ANON_KEY=sb_publishable_test npm run build -- --outDir dist-cloud-test && npm run preview -- --outDir dist-cloud-test --port 4182 --strictPort', url: 'http://127.0.0.1:4182', reuseExistingServer: false, timeout: 120000 } });
