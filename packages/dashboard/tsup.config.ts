import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { server: 'src/server/index.ts' },
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  clean: false,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildOptions(options) {
    options.platform = 'node'
  },
})
