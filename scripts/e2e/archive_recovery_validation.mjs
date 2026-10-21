import { chromium, request } from 'playwright'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ts = require(`${root}/frontend/node_modules/typescript`)
const origin = process.env.THE_VOID_FILES_E2E_URL ?? 'http://127.0.0.1:8876'
if (new URL(origin).hostname !== '127.0.0.1' || ['8765', '5173', ''].includes(new URL(origin).port)) throw new Error('An isolated loopback test server is required')
const artifacts = resolve(root, 'scripts/e2e/artifacts/recovery')
mkdirSync(artifacts, { recursive: true })
const api = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'X-Profile-Identifier': 'main_chronicle' } })
const health = await (await api.get('/api/health')).json()
if (health.provider_mode_name !== 'synthetic') throw new Error('Synthetic test server required')
const module = { exports: {} }
const compiled = ts.transpileModule(readFileSync(`${root}/frontend/src/game_state/archive_run_state.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInThisContext(`(function(exports){${compiled}\n})`)(module.exports)
const { createInitialArchiveRunState, reduceArchiveRunState } = module.exports
await api.post('/api/profiles', { data: { display_name: 'Prueba aislada', profile_identifier: 'main_chronicle' } })
const before = await (await api.get('/api/profiles/main_chronicle/chronicle-snapshot')).json()
let state = {
  storageFormatVersion: 5, hasAiConfigurationBeenHandled: true, aiConfiguration: null,
  investigatorProgression: { level: 1, unspentExperiencePoints: 0, lifetimeExperiencePoints: 0, resolvedArchiveCount: 0, personalFunds: 420, attributeImprovementCounts: {}, investigatedWhisperIdentifiers: [] },
  moduleRecords: {}, investigatorRegistration: { fullName: 'Ana de Prueba', gender: 'feminine', birthDate: { day: 1, month: 1, year: 1990 }, originPlace: 'Tonalá', residencePlace: 'Zapopan', relationalAnchor: { kind: 'uprooted' } },
  investigatorAttributes: { im: 5, if: 5, c: 5, o: 5, co: 5, m: 5, s: 5 },
  hasOriginNarrationBeenWitnessed: true, hasThresholdNarrationBeenWitnessed: true, oicnauStance: 'sanctioned_operative', hasOicnauContactBeenConcluded: true,
  chosenWhisperIdentifier: null, confirmedTurnCount: 0, archiveRun: createInitialArchiveRunState(), chronicleClosure: null, narrationEntries: [],
  investigator: { investigatorName: 'Ana', level: 1, seriousWoundsSuffered: 0, operationalFunds: 1800, personalFunds: 420, belongingUnits: { signal_flare: 2, hand_lantern: 1, sealed_evidence_bag: 4 }, placeName: 'Zapopan', worldClockMinutes: 192 },
  haveImprovementsBeenConfirmed: false,
}
async function saveState(version) {
  const response = await api.put('/api/profiles/main_chronicle/chronicle-snapshot', { data: { expected_state_version: version, storage_format_version: 5, chronicle_state: state } })
  if (!response.ok()) throw new Error(`Snapshot setup: ${await response.text()}`)
  return (await response.json()).state_version
}
let snapshotVersion = await saveState(before.state_version)
const offer = await (await api.get('/api/case-start/whispers')).json()
const whisper = offer.offered_whispers.find((card) => card.is_case_material_available)
let current = await (await api.get('/api/case-start/archives/current')).json()
if (current.current_archive) {
  await api.post('/api/case-start/archives/current/abandon', { data: { abandon_key: `audit_abandon_${Date.now()}` } })
  await api.get('/api/case-start/whispers')
}
const response = await api.post('/api/case-start/archives', { data: { opening_key: `audit_open_${Date.now()}`, whisper_identifier: whisper.identifier } })
if (!response.ok()) throw new Error(await response.text())
const camel = (value) => Array.isArray(value) ? value.map(camel) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase()), camel(item)])) : value
const opening = camel(await response.json())
const resources = opening.investigatorResources
state.investigator = { ...state.investigator, ...resources, belongingUnits: Object.fromEntries(resources.belongingUnits.map((item) => [item.belongingIdentifier, item.units])), seriousWoundsSuffered: resources.seriousWoundCount }
const opened = reduceArchiveRunState({ archiveRun: state.archiveRun, investigator: state.investigator, personalizeDirectorText: text => text }, {
  kind: 'archive_opened', whisperIdentifier: whisper.identifier, archiveOpeningResolution: { ...opening.openingResolution, archiveCaseIdentifier: opening.archive.archiveCaseIdentifier, archiveTitle: opening.archive.archiveTitle, archiveNumberLabel: opening.archive.archiveNumberLabel, belongingDefinitions: opening.belongingDefinitions },
})
state = { ...state, ...opened, chosenWhisperIdentifier: whisper.identifier }
await saveState(snapshotVersion)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const report = { archiveTitle: opening.archive.archiveTitle, checks: [], pageErrors: [], failure: null }
page.on('pageerror', (error) => report.pageErrors.push(error.message))
await page.addInitScript(() => {
  if (!localStorage.getItem('the_void_files_player_settings')) localStorage.setItem('the_void_files_player_settings', JSON.stringify({ textRevealSpeed: 'instant', isReducedMotionRequested: true, isMusicEnabled: false, isSoundEnabled: false, isWeatherSoundEnabled: false }))
})
async function dismissTitle() {
  const title = page.getByRole('button', { name: 'Pulsar para continuar' })
  if (await title.isVisible().catch(() => false)) await title.click()
  const complete = page.getByRole('button', { name: 'Completar texto' })
  if (await complete.isVisible().catch(() => false)) await complete.click()
}
async function assertLayout(label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (overflow) throw new Error(`Horizontal overflow: ${label}`)
  report.checks.push(label)
  await page.screenshot({ path: resolve(artifacts, `${label}.png`), fullPage: true })
}
try {
  await page.goto(`${origin}/#/archivo`)
  await page.getByRole('button', { name: 'Continuar la Crónica' }).waitFor({ timeout: 15000 }).catch(() => {})
  if (await page.getByRole('button', { name: 'Continuar la Crónica' }).isVisible()) await page.getByRole('button', { name: 'Continuar la Crónica' }).click()
  await page.locator('main[data-confirmed-state-version="0"]').waitFor({ timeout: 20000 })
  await dismissTitle()
  await page.locator('.suggested-action-card').first().waitFor({ timeout: 15000 })
  let signalCommitted
  const committed = new Promise((resolve) => { signalCommitted = resolve })
  await page.route('**/api/consequences/investigator-actions', async (route) => {
    const result = await route.fetch()
    const answer = await result.json()
    signalCommitted(answer)
    await new Promise((resolve) => setTimeout(resolve, 4000))
    await route.fulfill({ response: result }).catch(() => {})
  }, { times: 1 })
  await page.locator('.suggested-action-card').first().click()
  await page.getByRole('button', { name: 'Enviar acción' }).click()
  const answer = await committed
  if (!answer.confirmed_turn) throw new Error(`Turn not confirmed: ${JSON.stringify(answer)}`)
  await page.reload()
  await page.locator('main[data-confirmed-state-version="1"]').waitFor({ timeout: 20000 })
  await dismissTitle()
  const history = await (await api.get('/api/consequences/turns')).json()
  if (history.turns.length !== 1) throw new Error('Reload duplicated the turn')
  if (await page.locator('main').getAttribute('data-last-confirmed-action-key') !== answer.confirmed_turn.action_key) throw new Error('Reload lost the confirmed action')
  report.checks.push('reload-after-server-commit-no-duplicate')
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await assertLayout(`archive-${width}`)
  }
  await page.goto(`${origin}/#/diario`)
  await page.getByRole('button', { name: 'Pulsar para continuar' }).waitFor({ timeout: 10000 })
  await dismissTitle()
  await page.getByRole('heading', { name: opening.archive.archiveTitle, exact: true }).waitFor()
  await assertLayout('journal-real-title')
  await page.goto(`${origin}/#/historica`)
  await page.getByRole('button', { name: 'Pulsar para continuar' }).waitFor({ timeout: 10000 })
  await dismissTitle()
  await page.getByRole('button', { name: 'Abrir el libro' }).click()
  await page.getByText(opening.archive.archiveTitle, { exact: true }).waitFor()
  await assertLayout('book-real-title')
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await assertLayout('book-css-zoom-200-percent')
  await page.evaluate(() => { document.documentElement.style.zoom = '' })
  await page.goto(`${origin}/#/archivo`)
  await page.locator('main[data-confirmed-state-version="1"]').waitFor({ timeout: 20000 })
  await dismissTitle()
  await page.keyboard.press('Tab')
  if (!(await page.evaluate(() => document.activeElement && document.activeElement !== document.body))) throw new Error('Keyboard focus missing')
  report.checks.push('keyboard-focus')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => localStorage.setItem('the_void_files_player_settings', JSON.stringify({ textRevealSpeed: 'instant', isReducedMotionRequested: false, isMusicEnabled: false, isSoundEnabled: false, isWeatherSoundEnabled: false })))
  await page.reload()
  await page.locator('main[data-confirmed-state-version="1"]').waitFor({ timeout: 20000 })
  await dismissTitle()
  await assertLayout('archive-normal-motion')
  if (await page.evaluate(() => JSON.parse(localStorage.getItem('the_void_files_player_settings')).isReducedMotionRequested)) throw new Error('Reduced motion remained enabled')
  for (const branch of ['walk_to_tower_foot', 'inspect_service_door']) {
    const current = (await (await api.get('/api/case-start/archives/current')).json()).current_archive
    const turn = await api.post('/api/consequences/investigator-actions', { data: {
      action_key: `audit_${branch}_${Date.now()}`, expected_state_version: current.archive_run.state_version,
      scene_identifier: current.archive_run.public_state.current_scene_presentation.scene_identifier,
      remaining_plan_steps: [{ step_identifier: branch, action_text: branch, condition_text: null, origin_suggested_action_identifier: branch, was_text_edited_by_player: false, declared_resource_cost: null }],
      declared_plan_step_count: 1, already_executed_step_count: 0, is_player_insisting_after_director_veto: false, referenced_interactive_piece_identifier: null,
    } })
    if (!turn.ok() || !(await turn.json()).confirmed_turn) throw new Error(`Piece setup failed: ${branch}`)
  }
  await page.reload()
  await page.locator('main[data-confirmed-state-version="3"]').waitFor({ timeout: 20000 })
  await dismissTitle()
  const unfold = page.getByRole('button', { name: /Desplegar la pieza|Examinar la pieza/ }).first()
  if (await unfold.isVisible()) await unfold.click()
  const assistanceRequests = []
  await page.route('**/api/consequences/interactive-piece-assistance', async route => {
    assistanceRequests.push(route.request().postDataJSON())
    if (assistanceRequests.length === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'service_unavailable' }) })
    else await route.continue()
  })
  await page.getByRole('button', { name: 'Pedir ayuda', exact: true }).click()
  await page.getByRole('button', { name: /Ayuda suave/ }).click()
  await page.getByRole('button', { name: 'Reintentar la misma acción', exact: true }).click()
  await page.getByRole('heading', { name: 'Ayudas recibidas' }).waitFor({ timeout: 20000 })
  if (assistanceRequests.length !== 2 || assistanceRequests[0].action_key !== assistanceRequests[1].action_key) throw new Error('Assistance retry changed its identity')
  const finalHistory = await (await api.get('/api/consequences/turns')).json()
  if (finalHistory.turns.filter(turn => turn.resolution.confirmed_turn).length !== 3) throw new Error('Assistance retry repeated an investigator action')
  report.checks.push('assistance-retry-same-key-no-repeated-action')
  await assertLayout('assistance-recovered')
  if (report.pageErrors.length) throw new Error(`Console errors: ${report.pageErrors.join('; ')}`)
} catch (error) {
  report.failure = error.stack
  console.log((await page.locator('body').innerText()).slice(-3000))
  await page.screenshot({ path: resolve(artifacts, 'failure.png'), fullPage: true })
} finally {
  writeFileSync(resolve(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  await api.dispose()
}
if (report.failure) process.exit(1)
