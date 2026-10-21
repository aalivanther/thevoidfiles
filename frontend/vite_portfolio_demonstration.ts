import path from 'node:path'
import type { Plugin } from 'vite'

const substitutedModulePairs = [
  ['src/main.tsx', 'src/portfolio_demo/portfolio_demo_main.tsx'],
  ['src/game_service/game_service_client.ts', 'src/portfolio_demo/offline_game_service_client.ts'],
  ['src/game_state/archive_director_service_loading.ts', 'src/portfolio_demo/demo_archive_director_service_loading.ts'],
  ['src/voice/voice_service_client.ts', 'src/portfolio_demo/offline_voice_service_client.ts'],
  ['src/copy/archive_chat_engine/chronicle_closed_copy.ts', 'src/portfolio_demo/nameless_copy/chronicle_closed_copy.ts'],
  ['src/copy/archive_chat_engine/relationships_copy.ts', 'src/portfolio_demo/nameless_copy/relationships_copy.ts'],
  ['src/copy/chronicle_history_copy.ts', 'src/portfolio_demo/nameless_copy/chronicle_history_copy.ts'],
  ['src/copy/investigator_profile_copy.ts', 'src/portfolio_demo/nameless_copy/investigator_profile_copy.ts'],
  ['src/copy/organizations_allies_copy.ts', 'src/portfolio_demo/nameless_copy/organizations_allies_copy.ts'],
  ['src/copy/sanctuary_home_copy.ts', 'src/portfolio_demo/nameless_copy/sanctuary_home_copy.ts'],
] as const

export const portfolioDemonstrationBuildSettings = {
  modeName: 'demo',
  publicBasePath: '/thevoidfiles/',
  outputDirectoryRelativeToFrontend: '../../demos/thevoidfiles',
  substitutedModulePairs,
  resolveOutputDirectory(frontendRootDirectory: string): string {
    return path.resolve(frontendRootDirectory, portfolioDemonstrationBuildSettings.outputDirectoryRelativeToFrontend)
  },
}

export function substitutePortfolioDemonstrationModules(frontendRootDirectory: string): Plugin {
  const replacementByOriginalPath = new Map(
    substitutedModulePairs.map(([originalRelativePath, replacementRelativePath]) => [
      path.resolve(frontendRootDirectory, originalRelativePath),
      path.resolve(frontendRootDirectory, replacementRelativePath),
    ]),
  )
  return {
    name: 'the-void-files-portfolio-demonstration-modules',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolvedModule = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolvedModule) {
        return null
      }
      const replacementPath = replacementByOriginalPath.get(resolvedModule.id.split('?')[0])
      const isReplacementImportingItsOriginal = importer !== undefined && importer.split('?')[0] === replacementPath
      return replacementPath && !isReplacementImportingItsOriginal ? { ...resolvedModule, id: replacementPath } : resolvedModule
    },
  }
}
