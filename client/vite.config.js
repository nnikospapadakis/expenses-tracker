import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production build is served under the /tracker/ subpath on the main domain.
// Dev stays at root so the local workflow is unchanged.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/tracker/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4000" },
  },
}));
