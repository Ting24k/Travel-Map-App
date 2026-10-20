import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const key = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (key) {
        let privateKey = key.startsWith('sb_secret_');
        if (key.split('.').length === 3) {
            try {
                privateKey = privateKey || JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon';
            }
            catch {
                throw Error('Invalid public Supabase key configuration');
            }
        }
        if (privateKey)
            throw Error('A private Supabase key must never be included in a frontend build. Use a publishable or anon key.');
    }
    return {
        base: process.env.BASE_PATH || "/",
        build: { rollupOptions: { output: { manualChunks: { react: ["react", "react-dom"], storage: ["dexie"], geo: ["d3"] } } } },
        plugins: [
            react(),
            tailwind(),
            VitePWA({
                registerType: "prompt",
                includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
                manifest: {
                    name: "Our Little World",
                    short_name: "Little World",
                    description: "A little map of everywhere you have been.",
                    theme_color: "#536b57",
                    background_color: "#f8f7f2",
                    display: "standalone",
                    start_url: ".",
                    scope: ".",
                    icons: [
                        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
                        {
                            src: "icons/icon-512.png",
                            sizes: "512x512",
                            type: "image/png",
                            purpose: "any maskable",
                        },
                    ],
                },
                workbox: {
                    clientsClaim: true,
                    globPatterns: ["**/*.{js,css,html,ico,png,svg,json,webmanifest}"],
                    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
                    navigateFallback: "index.html",
                },
            }),
        ],
    };
});
