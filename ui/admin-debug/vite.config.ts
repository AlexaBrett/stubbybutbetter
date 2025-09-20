import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export default defineConfig(async () => {
  // Dynamically import ESM-only Tailwind Vite plugin to avoid require()-loading
  const { default: tailwindcss } = await import('@tailwindcss/vite')

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  return {
    root: __dirname,
    base: '/stubbybutbetter/ui/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-favicon-link',
        transformIndexHtml: {
          enforce: 'pre',
          transform (html: string) {
            if (html.includes('/stubbybutbetter/favicon.svg')) return html
            return html.replace('<head>', '<head>\n    <link rel="icon" href="/stubbybutbetter/favicon.svg" />')
          }
        }
      }
    ],
    build: {
      outDir: resolve(__dirname, '../../webroot/ui'),
      emptyOutDir: true
    },
    server: {
      port: 5173,
      strictPort: true
    }
  }
})
