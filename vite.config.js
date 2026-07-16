import { defineConfig } from 'vite';

export default defineConfig({
  // Asegurar que los assets GLB/GLTF/WebP se sirven como estáticos
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.webp'],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Separar Three.js en chunk propio para mejor caching
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
