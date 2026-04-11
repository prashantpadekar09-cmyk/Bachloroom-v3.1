import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    allowedHosts: ["bachloroom-v3-1.onrender.com"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Increase warning threshold so we only see real problems
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — shared by everything, cached once
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Query layer
          "vendor-query": ["@tanstack/react-query"],
          // Framer-motion is heavy (~60KB gzip), isolate it
          "vendor-motion": ["framer-motion"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // UI primitives (radix)
          "vendor-ui": [
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dialog",
            "@radix-ui/react-slot",
          ],
        },
      },
    },
    // Better minification
    target: "es2020",
    // Source maps off in production for smaller output
    sourcemap: false,
  },
}));
