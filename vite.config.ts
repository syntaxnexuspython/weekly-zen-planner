import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // if the wrapper merges this into the nitro config
  },
  nitro: {
    preset: "vercel", // or similar — depends on what the wrapper exposes
  },
});