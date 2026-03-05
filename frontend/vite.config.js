import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/aai590_5_capstone_project/",
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
