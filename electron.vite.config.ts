import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const compartilhado = { "@shared": resolve("src/shared") };

/** Marca do build (src/shared/build.ts): código aleatório novo a cada build + data/hora. */
const marcaBuild = { __FALAAI_BUILD__: JSON.stringify({ id: randomBytes(3).toString("hex"), data: new Date().toISOString() }) };

export default defineConfig({
  main: {
    define: marcaBuild,
    resolve: { alias: compartilhado },
  },
  preload: {
    define: marcaBuild,
    resolve: { alias: compartilhado },
    build: {
      // Preload em CommonJS: funciona com sandbox ligado.
      rollupOptions: { output: { format: "cjs", entryFileNames: "[name].cjs" } },
    },
  },
  renderer: {
    define: marcaBuild,
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
