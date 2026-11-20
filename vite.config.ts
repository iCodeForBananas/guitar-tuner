import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the built files load from the native app bundles
// (capacitor://localhost, https://localhost) and from the GitHub Pages
// subpath alike.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    // Makes the web build an installable, offline-capable app: a manifest
    // plus a service worker that precaches every built file. The service
    // worker is only registered on the web (see src/pwa.ts); the native apps
    // already ship the files in their bundle.
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "privacy.html"],
      manifest: {
        id: "./",
        name: "Guitar Tuner",
        short_name: "Guitar Tuner",
        description: "A free, open-source guitar tuner. Pick a string, pluck it, and get it green.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#101214",
        theme_color: "#101214",
        categories: ["music", "utilities"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/privacy\.html$/],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
