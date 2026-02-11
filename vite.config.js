import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'

// Plugin to serve onnxruntime-web WASM/MJS files from node_modules.
// ORT dynamically imports its worker (.mjs) and fetches .wasm files at runtime.
// Vite doesn't serve these correctly from node_modules, so we intercept
// root-level requests for "ort-wasm-*" and serve them directly.
function serveOnnxruntimeFiles() {
  const ortDist = join(process.cwd(), 'node_modules', 'onnxruntime-web', 'dist')

  return {
    name: 'serve-onnxruntime-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Match /ort-wasm-*.mjs or /ort-wasm-*.wasm requests
        const url = req.url?.split('?')[0] // strip query params like ?import
        if (!url || !url.startsWith('/ort-wasm-')) return next()

        const filename = basename(url)
        const filePath = join(ortDist, filename)

        if (!existsSync(filePath)) return next()

        const content = readFileSync(filePath)
        const ext = filename.split('.').pop()

        const mimeTypes = {
          mjs: 'application/javascript',
          js: 'application/javascript',
          wasm: 'application/wasm',
        }

        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        res.end(content)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    serveOnnxruntimeFiles(),
    react(),
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
})
