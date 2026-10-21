import type { ArchiveDirectorService } from '../game_state/archive_turn_contract'
import type { loadArchiveDirectorService as loadRealArchiveDirectorService } from '../game_state/archive_director_service_loading'

let pendingDemoArchiveDirectorService: Promise<ArchiveDirectorService> | null = null

export const loadArchiveDirectorService: typeof loadRealArchiveDirectorService = () => {
  pendingDemoArchiveDirectorService ??= Promise.all([
    import('./demo_archive_director_service'),
    import('./decision_tree/lighthouse_demo_decision_tree'),
  ])
    .then(([serviceModule, treeModule]) => serviceModule.createDemoArchiveDirectorService(treeModule.lighthouseDemoDecisionTree))
    .catch((loadingError: unknown) => {
      pendingDemoArchiveDirectorService = null
      throw loadingError
    })
  return pendingDemoArchiveDirectorService
}
