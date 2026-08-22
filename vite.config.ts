import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Served from the root of the custom domain (xiangqi.earth.io.vn). If the site
  // ever moves back to truonganim.github.io/Xiangqi/, this has to become
  // '/Xiangqi/' again — GitHub Pages project paths are case-sensitive.
  base: '/',
  plugins: [react(), tailwindcss()],
})
