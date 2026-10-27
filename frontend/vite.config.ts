import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { portfolioDemonstrationBuildSettings, substitutePortfolioDemonstrationModules } from './vite_portfolio_demonstration.ts'
import { keepOnlyRenderedPhosphorWeights, preloadStartupScreenModules } from './vite_lean_delivery.ts'

const frontendRootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const leanDeliveryPlugins = [keepOnlyRenderedPhosphorWeights(frontendRootDirectory), preloadStartupScreenModules()]
  if (mode !== portfolioDemonstrationBuildSettings.modeName) {
    return {
      plugins: [react(), tailwindcss(), ...leanDeliveryPlugins],
      server: { port: 5173, strictPort: true },
    }
  }
  return {
    base: portfolioDemonstrationBuildSettings.publicBasePath,
    plugins: [substitutePortfolioDemonstrationModules(frontendRootDirectory), react(), tailwindcss(), ...leanDeliveryPlugins],
    build: {
      outDir: portfolioDemonstrationBuildSettings.resolveOutputDirectory(frontendRootDirectory),
      emptyOutDir: true,
    },
  }
})
