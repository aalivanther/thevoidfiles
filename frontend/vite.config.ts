import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { portfolioDemonstrationBuildSettings, substitutePortfolioDemonstrationModules } from './vite_portfolio_demonstration.ts'

const frontendRootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  if (mode !== portfolioDemonstrationBuildSettings.modeName) {
    return {
      plugins: [react(), tailwindcss()],
      server: { port: 5173, strictPort: true },
    }
  }
  return {
    base: portfolioDemonstrationBuildSettings.publicBasePath,
    plugins: [substitutePortfolioDemonstrationModules(frontendRootDirectory), react(), tailwindcss()],
    build: {
      outDir: portfolioDemonstrationBuildSettings.resolveOutputDirectory(frontendRootDirectory),
      emptyOutDir: true,
    },
  }
})
