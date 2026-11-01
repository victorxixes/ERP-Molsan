import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    // Una única hoja evita que los CSS de rutas lazy entren después del tema global. 
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return undefined;
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) return "react-vendor";
          if (id.includes("/node_modules/react-router")) return "router-vendor";
          if (
            id.includes("/node_modules/chart.js/") ||
            id.includes("/node_modules/@kurkle/")
          ) return "charts-vendor";
          if (
            id.includes("/node_modules/react-calendar/") ||
            id.includes("/node_modules/date-fns/")
          ) return "calendar-vendor";
          if (id.includes("/node_modules/axios/")) return "http-vendor";
          return undefined;
        },
      },
    },
  },
});
