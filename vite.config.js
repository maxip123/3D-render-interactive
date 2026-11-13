import { defineConfig } from 'vite';
export default defineConfig({
  base: './',   // rutas relativas: el sitio funciona también dentro de una subcarpeta
  test: { include: ['tests/**/*.test.js'], testTimeout: 60000 },
});
