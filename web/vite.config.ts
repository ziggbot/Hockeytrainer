import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// `--mode artifact` builds the claude.ai preview (scripts/build-artifact.mjs):
// no service worker (the sandbox forbids it) and every asset inlined, so the
// result can be folded into one HTML file.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      disable: mode === "artifact",
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Tränarappen",
        short_name: "Tränarappen",
        description: "Planera och kör hockeyträningen – även utan täckning i hallen.",
        theme_color: "#eef2f6",
        background_color: "#eef2f6",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "sv",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: {
        // Fonts are bundled (woff2) and precached so rink mode renders
        // correctly with no signal in the arena.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html"
      }
    })
  ],
  server: { port: 5173, host: true },
  ...(mode === "artifact" && {
    build: { outDir: "dist-artifact", assetsInlineLimit: Number.MAX_SAFE_INTEGER, cssCodeSplit: false }
  })
}));
