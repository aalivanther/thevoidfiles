// Validación de punta a punta de la demo estática de portafolio.
//
// Qué hace: abre la demo ya compilada en un Chromium sin cabeza y juega, desde la
// portada y con clics reales sobre la interfaz, todas las rutas del árbol de
// decisión hasta su final. En cada ruta comprueba que no haya errores de consola,
// errores de página, respuestas 404 ni peticiones fuera del propio sitio; al final
// comprueba que el botón de reinicio devuelve la partida a la portada.
//
// Por qué así: la suite unitaria prueba el motor, pero no que la aplicación real
// cargue y se deje jugar. Las rutas salen del mismo módulo TypeScript que usan los
// tests (demo_decision_tree_routes.ts), así que la prueba y el árbol no se separan.
//
// Uso:
//   (desde Akyrion/demos) python3 -m http.server 8899 --bind 127.0.0.1 --protocol HTTP/1.1
// HTTP/1.1 importa: en HTTP/1.0 cada petición abre una conexión nueva, y la precarga
// de pantallas en segundo plano desborda la cola del servidor (ERR_CONNECTION_RESET).
//   node scripts/e2e/portfolio_demo_validation.mjs [url_base] [carpeta_de_capturas]
import { mkdirSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

// Los módulos del frontend importan sin extensión (estilo Vite). Este gancho de
// resolución prueba .ts cuando Node no encuentra el archivo tal cual, para poder
// importar el árbol y el planificador de rutas sin compilar nada antes.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (resolutionError) {
      if (!specifier.startsWith('.') || path.extname(specifier) !== '') {
        throw resolutionError
      }
      return nextResolve(`${specifier}.ts`, context)
    }
  },
})

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const decisionTreeDirectory = path.resolve(scriptDirectory, '../../frontend/src/portfolio_demo/decision_tree')
const { lighthouseDemoDecisionTree } = await import(pathToFileURL(path.join(decisionTreeDirectory, 'lighthouse_demo_decision_tree.ts')).href)
const { enumerateDemoDecisionRoutes } = await import(pathToFileURL(path.join(decisionTreeDirectory, 'demo_decision_tree_routes.ts')).href)

const baseAddress = process.argv[2] ?? 'http://127.0.0.1:8899/thevoidfiles/'
const artifactsDirectory = process.argv[3] ?? path.join(tmpdir(), 'the_void_files_portfolio_demo_validation')
const routeIdentifierFilter = process.argv[4] ?? ''
const chronicleStorageKey = 'the_void_files_demonstration_chronicle'
// El investigador sembrado no tiene nombre propio: lleva el rol del juego.
const seededInvestigatorFullName = 'Investigador'
const turnTimeoutMilliseconds = 30000
const actionabilityTimeoutMilliseconds = 15000
// La barra de navegación del portafolio (/dock.js) la inyecta el sitio que aloja
// la demo y no existe en el servidor local de verificación; su 404 no es de la demo.
const ignoredMissingAddresses = [new URL('/dock.js', baseAddress).href]
const siteOrigin = new URL(baseAddress).origin

mkdirSync(artifactsDirectory, { recursive: true })

const routes = enumerateDemoDecisionRoutes(lighthouseDemoDecisionTree).filter((route) =>
  route.routeIdentifier.includes(routeIdentifierFilter),
)
const pieceByIdentifier = new Map(
  lighthouseDemoDecisionTree.interactivePieces.map((piece) => [piece.publicDefinition.interactivePieceIdentifier, piece]),
)

class DemoValidationError extends Error {
  constructor(problemDescription) {
    super(problemDescription)
    this.name = 'DemoValidationError'
  }
}

function watchPageHealth(page) {
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !ignoredMissingAddresses.includes(message.location().url)) {
      problems.push(`console_error: ${message.text()} @ ${message.location().url}`)
    }
  })
  page.on('pageerror', (pageError) => problems.push(`page_error: ${pageError.message}`))
  page.on('response', (response) => {
    if (response.status() >= 400 && !ignoredMissingAddresses.includes(response.url())) {
      problems.push(`http_${response.status()}: ${response.url()}`)
    }
  })
  page.on('request', (request) => {
    const requestAddress = request.url()
    if (!requestAddress.startsWith('data:') && !requestAddress.startsWith('blob:') && new URL(requestAddress).origin !== siteOrigin) {
      problems.push(`external_request: ${requestAddress}`)
    }
  })
  return problems
}

async function readChronicle(page) {
  return page.evaluate((storageKey) => JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null'), chronicleStorageKey)
}

async function readStateVersion(page) {
  const chronicle = await readChronicle(page)
  return chronicle?.archiveRun?.stateVersion ?? null
}

async function waitForStateVersionAbove(page, previousStateVersion) {
  await page.waitForFunction(
    ({ storageKey, previousVersion }) => {
      const chronicle = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null')
      return (chronicle?.archiveRun?.stateVersion ?? -1) > previousVersion
    },
    { storageKey: chronicleStorageKey, previousVersion: previousStateVersion },
    { timeout: turnTimeoutMilliseconds },
  )
}

async function openLighthouseArchive(page) {
  await page.goto(baseAddress)
  await page.getByRole('button', { name: /continuar la crónica/i }).click({ timeout: actionabilityTimeoutMilliseconds })
  await page.getByRole('button', { name: 'Investigar este Susurro' }).first().click({ timeout: actionabilityTimeoutMilliseconds })
  await page.getByRole('button', { name: /abrir archivo/i }).click({ timeout: actionabilityTimeoutMilliseconds })
  await page.locator('button[data-suggested-action-identifier]').first().waitFor({ timeout: turnTimeoutMilliseconds })
}

// La interfaz pide confirmar un gasto (fondos, pertenencias o reloj) solo cuando el
// paso lo tiene; si el botón de confirmación no aparece en 1,5 s es que no hacía falta.
async function confirmWhenAsked(page, confirmationButtonName) {
  const confirmationButton = page.getByRole('button', { name: confirmationButtonName })
  const isConfirmationShown = await confirmationButton.waitFor({ state: 'visible', timeout: 1500 }).then(
    () => true,
    () => false,
  )
  if (isConfirmationShown) {
    await confirmationButton.click()
  }
}

async function playSuggestedAction(page, actionIdentifier) {
  const suggestionButton = page.locator(`button[data-suggested-action-identifier="${actionIdentifier}"]`)
  if (!(await suggestionButton.isVisible())) {
    const otherCoursesButton = page.getByRole('button', { name: /^Otros cursos/ })
    if (await otherCoursesButton.isVisible()) {
      await otherCoursesButton.click()
    }
  }
  const previousStateVersion = await readStateVersion(page)
  await suggestionButton.click({ timeout: actionabilityTimeoutMilliseconds })
  await page.getByRole('button', { name: 'Enviar acción' }).click({ timeout: actionabilityTimeoutMilliseconds })
  await confirmWhenAsked(page, 'Confirmar coste y enviar')
  await waitForStateVersionAbove(page, previousStateVersion)
}

async function locatePieceFrame(page, interactivePieceIdentifier) {
  const piece = pieceByIdentifier.get(interactivePieceIdentifier)
  const pieceFrame = page.locator(`section.interactive-piece-frame[aria-label="${piece.publicDefinition.visibleTitle}"]`).last()
  await pieceFrame.scrollIntoViewIfNeeded({ timeout: actionabilityTimeoutMilliseconds })
  if ((await pieceFrame.getAttribute('data-presentation')) === 'compact_card') {
    await pieceFrame.getByRole('button', { name: /desplegar la pieza|examinar la pieza/i }).first().click()
  }
  return { piece, pieceFrame }
}

async function setPieceValue(pieceFrame, submittedValue) {
  if (submittedValue.widgetKindName === 'combination_dials') {
    const dials = pieceFrame.locator('[role="spinbutton"]')
    for (const [dialIndex, chosenSymbol] of submittedValue.chosenSymbols.entries()) {
      await dials.nth(dialIndex).focus()
      await dials.nth(dialIndex).press(chosenSymbol)
    }
    return
  }
  if (submittedValue.widgetKindName === 'cipher_wheel') {
    const wheel = pieceFrame.locator('[role="slider"]')
    await wheel.focus()
    await wheel.press('Home')
    for (let stepIndex = 0; stepIndex < submittedValue.shiftPositions; stepIndex += 1) {
      await wheel.press('ArrowRight')
    }
    const reachedShift = Number(await wheel.getAttribute('aria-valuenow'))
    if (reachedShift !== submittedValue.shiftPositions) {
      throw new DemoValidationError(`cipher_wheel_shift_mismatch:${reachedShift}!=${submittedValue.shiftPositions}`)
    }
    return
  }
  throw new DemoValidationError(`unsupported_widget_value:${submittedValue.widgetKindName}`)
}

async function orderPlates(pieceFrame, piece, orderedPieceIdentifiers) {
  const visibleNameByIdentifier = new Map(
    piece.publicDefinition.publicState.pieces.map((orderedPiece) => [orderedPiece.pieceIdentifier, orderedPiece.visibleName]),
  )
  const targetNames = orderedPieceIdentifiers.map((pieceIdentifier) => visibleNameByIdentifier.get(pieceIdentifier))
  const readCurrentNames = async () =>
    (await pieceFrame.locator('button[aria-label^="Subir "]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))))
      .map((buttonLabel) => buttonLabel.replace(/^Subir /, '').replace(/ una posición$/, ''))
  for (const [targetIndex, targetName] of targetNames.entries()) {
    let currentIndex = (await readCurrentNames()).indexOf(targetName)
    while (currentIndex > targetIndex) {
      await pieceFrame.getByRole('button', { name: `Subir ${targetName} una posición` }).click()
      currentIndex -= 1
    }
  }
  const reachedNames = await readCurrentNames()
  if (JSON.stringify(reachedNames) !== JSON.stringify(targetNames)) {
    throw new DemoValidationError(`ordered_plates_mismatch:${reachedNames.join(',')}`)
  }
}

async function submitPieceAttempt(page, pieceFrame, piece, submittedValue) {
  if (submittedValue.widgetKindName === 'ordered_positions') {
    await orderPlates(pieceFrame, piece, submittedValue.orderedPieceIdentifiers)
  } else {
    await setPieceValue(pieceFrame, submittedValue)
  }
  const previousStateVersion = await readStateVersion(page)
  await pieceFrame.getByRole('button', { name: /^probar$/i }).click({ timeout: actionabilityTimeoutMilliseconds })
  await confirmWhenAsked(page, 'Probar y gastar el tiempo')
  await waitForStateVersionAbove(page, previousStateVersion)
}

function createWrongValue(piece) {
  const { publicState } = piece.publicDefinition
  if (publicState.widgetKindName === 'combination_dials') {
    return { widgetKindName: 'combination_dials', chosenSymbols: publicState.dials.map((dial) => dial.symbols[1]) }
  }
  if (publicState.widgetKindName === 'cipher_wheel') {
    return { widgetKindName: 'cipher_wheel', shiftPositions: 1 }
  }
  return { widgetKindName: 'ordered_positions', orderedPieceIdentifiers: [...publicState.initialOrderPieceIdentifiers] }
}

async function requestGentleAssistance(page, pieceFrame, piece) {
  await pieceFrame.getByRole('button', { name: 'Pedir ayuda' }).click({ timeout: actionabilityTimeoutMilliseconds })
  await pieceFrame.getByRole('button', { name: /Ayuda suave/ }).click({ timeout: actionabilityTimeoutMilliseconds })
  await pieceFrame.getByText(piece.assistanceHintTextByLevelName.gentle).first().waitFor({ timeout: turnTimeoutMilliseconds })
}

const exercisedFailurePieceIdentifiers = new Set()

async function playPieceStep(page, routeStep, routeReport) {
  const { piece, pieceFrame } = await locatePieceFrame(page, routeStep.interactivePieceIdentifier)
  if (!exercisedFailurePieceIdentifiers.has(routeStep.interactivePieceIdentifier)) {
    exercisedFailurePieceIdentifiers.add(routeStep.interactivePieceIdentifier)
    await requestGentleAssistance(page, pieceFrame, piece)
    await submitPieceAttempt(page, pieceFrame, piece, createWrongValue(piece))
    const chronicleAfterFailure = await readChronicle(page)
    const runtimeState = chronicleAfterFailure.archiveRun.interactivePieceRuntimeStates[routeStep.interactivePieceIdentifier]
    if (runtimeState.lifecycleStatusName === 'resolved' || runtimeState.attempts.at(-1)?.wasAccepted !== false) {
      throw new DemoValidationError(`wrong_value_was_not_rejected:${routeStep.interactivePieceIdentifier}`)
    }
    routeReport.failedAttemptsAndAssistance.push(routeStep.interactivePieceIdentifier)
    await page.screenshot({ path: path.join(artifactsDirectory, `piece_${routeStep.interactivePieceIdentifier}_after_failed_attempt.png`) })
  }
  const { pieceFrame: refreshedFrame } = await locatePieceFrame(page, routeStep.interactivePieceIdentifier)
  await submitPieceAttempt(page, refreshedFrame, piece, routeStep.acceptedValue)
}

async function playRoute(browser, route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const problems = watchPageHealth(page)
  const routeReport = { routeIdentifier: route.routeIdentifier, endingIdentifier: route.endingIdentifier, stepCount: route.steps.length, failedAttemptsAndAssistance: [], problems }
  const startedAt = Date.now()
  try {
    await openLighthouseArchive(page)
    for (const routeStep of route.steps) {
      if (routeStep.kind === 'action') {
        await playSuggestedAction(page, routeStep.actionIdentifier)
      } else {
        await playPieceStep(page, routeStep, routeReport)
      }
    }
    const finalChronicle = await readChronicle(page)
    const archiveOutcome = finalChronicle.archiveRun.archiveOutcome
    const expectedOutcomeKind = route.isDeathEnding ? 'chronicle_closed_by_death' : 'archive_ended_alive'
    if (archiveOutcome?.kind !== expectedOutcomeKind) {
      problems.push(`unexpected_outcome_kind:${archiveOutcome?.kind}`)
    }
    if (archiveOutcome?.kind === 'archive_ended_alive' && archiveOutcome.endingIdentifier !== route.endingIdentifier) {
      problems.push(`unexpected_ending:${archiveOutcome.endingIdentifier}`)
    }
    routeReport.finalStateVersion = finalChronicle.archiveRun.stateVersion
    await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(artifactsDirectory, `${route.routeIdentifier}.png`) })
  } catch (playbackError) {
    problems.push(`playback_failed: ${playbackError.message.split('\n')[0]}`)
    await page
      .screenshot({ path: path.join(artifactsDirectory, `${route.routeIdentifier}_failure.png`) })
      .catch((screenshotError) => problems.push(`failure_screenshot_not_taken: ${screenshotError.message}`))
  }
  routeReport.durationSeconds = Math.round((Date.now() - startedAt) / 1000)
  await context.close()
  return routeReport
}

async function verifyRestart(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const problems = watchPageHealth(page)
  try {
    await openLighthouseArchive(page)
    await playSuggestedAction(page, 'walk_to_tower_foot')
    const versionBeforeRestart = await readStateVersion(page)
    await page.locator('[data-portfolio-demo-restart="true"]').click()
    await page.getByRole('button', { name: 'Sí, reiniciar' }).click()
    await page.getByRole('button', { name: /continuar la crónica/i }).waitFor({ timeout: turnTimeoutMilliseconds })
    const chronicleAfterRestart = await readChronicle(page)
    if (chronicleAfterRestart?.chosenWhisperIdentifier !== null || chronicleAfterRestart?.investigatorRegistration?.fullName !== seededInvestigatorFullName) {
      problems.push('restart_did_not_reseed_chronicle')
    }
    if (new URL(page.url()).hash !== '') {
      problems.push(`restart_kept_screen_address:${page.url()}`)
    }
    await openLighthouseArchive(page)
    const versionAfterReopening = await readStateVersion(page)
    if (versionAfterReopening !== 0) {
      problems.push(`reopened_archive_not_fresh:${versionAfterReopening}`)
    }
    await page.screenshot({ path: path.join(artifactsDirectory, 'restart_reopened_archive.png') })
    return { versionBeforeRestart, versionAfterReopening, problems }
  } catch (restartError) {
    problems.push(`restart_failed: ${restartError.message.split('\n')[0]}`)
    return { problems }
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch()
const routeReports = []
for (const route of routes) {
  const routeReport = await playRoute(browser, route)
  routeReports.push(routeReport)
  console.log(
    `${routeReport.problems.length === 0 ? 'OK  ' : 'FAIL'} ${route.routeIdentifier} · ${route.steps.length} pasos · ${routeReport.durationSeconds}s${
      routeReport.problems.length > 0 ? `\n     ${routeReport.problems.join('\n     ')}` : ''
    }`,
  )
}
const restartReport = await verifyRestart(browser)
console.log(`${restartReport.problems.length === 0 ? 'OK  ' : 'FAIL'} reinicio${restartReport.problems.length > 0 ? `\n     ${restartReport.problems.join('\n     ')}` : ''}`)
await browser.close()

const reachedEndingIdentifiers = new Set(routeReports.filter((report) => report.problems.length === 0).map((report) => report.endingIdentifier))
const missingEndingIdentifiers = lighthouseDemoDecisionTree.endings
  .map((ending) => ending.endingIdentifier)
  .filter((endingIdentifier) => !reachedEndingIdentifiers.has(endingIdentifier))
const validationSummary = {
  baseAddress,
  routeCount: routes.length,
  failedRouteCount: routeReports.filter((report) => report.problems.length > 0).length,
  missingEndingIdentifiers,
  piecesWithFailedAttemptAndAssistance: [...exercisedFailurePieceIdentifiers],
  routeReports,
  restartReport,
}
writeFileSync(path.join(artifactsDirectory, 'portfolio_demo_validation_report.json'), JSON.stringify(validationSummary, null, 2))
console.log(
  `rutas: ${routes.length} · fallidas: ${validationSummary.failedRouteCount} · finales sin alcanzar: ${missingEndingIdentifiers.length} · informe: ${artifactsDirectory}`,
)
if (validationSummary.failedRouteCount > 0 || missingEndingIdentifiers.length > 0 || restartReport.problems.length > 0) {
  process.exitCode = 1
}
