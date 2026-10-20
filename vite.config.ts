import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: process.env.BASE_PATH || "/",
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
});
