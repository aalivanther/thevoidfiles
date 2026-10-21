import type { ScreenName } from '../navigation/screen_navigation'

export type ModuleThemeName =
  | 'cosmic'
  | 'bureau'
  | 'clinic'
  | 'memory'
  | 'agency'
  | 'noir'
  | 'casefile'
  | 'verdict'
  | 'credits'
  | 'configuration'
  | 'dossier'
  | 'journal'
  | 'atlas'
  | 'sanctuary'
  | 'factions'
  | 'profile'
  | 'history'
  | 'epitaph'

export const moduleThemeByScreenName: Record<ScreenName, ModuleThemeName> = {
  ai_configuration: 'configuration',
  title: 'cosmic',
  character_dossier: 'dossier',
  case_journal: 'journal',
  world_atlas: 'atlas',
  sanctuary_home: 'sanctuary',
  organizations_allies: 'factions',
  investigator_profile: 'profile',
  chronicle_history: 'history',
  investigator_registration: 'bureau',
  investigator_evaluation: 'clinic',
  origin_narration: 'memory',
  threshold_narration: 'cosmic',
  oicnau_contact: 'agency',
  acknowledgements: 'credits',
  whisper_selection: 'noir',
  archive_play: 'casefile',
  archive_closure: 'verdict',
  chronicle_closed: 'epitaph',
}

export const screenTransitionVariantNamesByModuleTheme: Record<ModuleThemeName, readonly string[]> = {
  cosmic: ['warp_streaks', 'ringed_iris'],
  bureau: ['filing_drawers', 'dropping_sheet'],
  clinic: ['mirror_fold', 'ink_bleed'],
  memory: ['photo_flash', 'film_strip'],
  agency: ['redaction_bars', 'tube_shutdown'],
  noir: ['venetian_blinds', 'ink_slash'],
  casefile: ['comic_panels', 'torn_page'],
  verdict: ['dropping_sheet', 'tube_shutdown'],
  credits: ['ringed_iris', 'venetian_blinds'],
  configuration: ['tube_shutdown', 'ringed_iris'],
  dossier: ['filing_drawers', 'dropping_sheet'],
  journal: ['torn_page', 'photo_flash'],
  atlas: ['warp_streaks', 'film_strip'],
  sanctuary: ['venetian_blinds', 'ink_bleed'],
  factions: ['redaction_bars', 'comic_panels'],
  profile: ['filing_drawers', 'dropping_sheet'],
  history: ['torn_page', 'dropping_sheet'],
  epitaph: ['tube_shutdown', 'ink_bleed'],
}
