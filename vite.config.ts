import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Must match the GitHub repo name exactly — Pages paths are case-sensitive.
  base: '/Xiangqi/',
  plugins: [react(), tailwindcss()],
})
