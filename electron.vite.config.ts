import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const compartilhado = { "@shared": resolve("src/shared") };

export default defineConfig({
  main: {
    resolve: { alias: compartilhado },
  },
  preload: {
    resolve: { alias: compartilhado },
    build: {
      // Preload em CommonJS: funciona com sandbox ligado.
      rollupOptions: { output: { format: "cjs", entryFileNames: "[name].cjs" } },
    },
  },
  renderer: {
    resolve: { alias: { ...compartilhado, "@": resolve("src/renderer/src") } },
    plugins: [react(), tailwindcss()],
    build: {
      // Uma página HTML por janela.
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          pilula: resolve("src/renderer/pilula.html"),
          onboarding: resolve("src/renderer/onboarding.html"),
          cartao: resolve("src/renderer/cartao.html"),
        },
      },
    },
  },
});
