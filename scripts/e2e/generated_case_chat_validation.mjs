import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const artifactDirectory = join(scriptDirectory, 'artifacts')
mkdirSync(artifactDirectory, { recursive: true })

async function clickIfVisible(locator, timeoutMilliseconds = 2500) {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMilliseconds })
    await locator.click({ timeout: 4000 })
    return true
  } catch {
    return false
  }
}

function hasForbiddenMarkup(text) {
  return /&[A-Za-z]+;|\{\{[a-z_]+\}\}|El faro que cuenta de más/i.test(text)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.emulateMedia({ reducedMotion: 'reduce' })
const consoleFailures = []
const assetFailures = []
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleFailures.push(message.text())
  }
})
page.on('response', (response) => {
  if (response.status() >= 400) {
    assetFailures.push(`${response.status()} ${response.url()}`)
  }
})

const report = {
  heading: null,
  cardCount: 0,
  openableCardCount: 0,
  openedHeadline: null,
  archiveTitle: null,
  suggestedActionCount: 0,
  visibleSuggestedActionCount: 0,
  hasHorizontalOverflow: false,
  hasForbiddenMarkup: false,
  sentSuggestedAction: null,
  directorAnswered: false,
  consoleFailures: [],
  assetFailures: [],
  failedAt: null,
}

try {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' })
  await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
  await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
  await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 6000)
  await clickIfVisible(page.getByRole('button', { name: 'Continuar la Crónica' }), 2000)
  await page.getByRole('heading', { name: 'Cuatro Susurros' }).waitFor({ timeout: 25000 })
  report.heading = await page.locator('h1').first().innerText()
  const cards = page.locator('article')
  await cards.first().waitFor({ timeout: 8000 })
  report.cardCount = await cards.count()
  const boardText = await page.locator('main').innerText()
  if (hasForbiddenMarkup(boardText)) {
    report.hasForbiddenMarkup = true
    throw new Error('whisper_board_has_forbidden_markup')
  }
  for (let cardIndex = 0; cardIndex < report.cardCount; cardIndex += 1) {
    const card = cards.nth(cardIndex)
    await card.getByRole('button', { name: 'Investigar este Susurro' }).click()
    const openButton = page.getByRole('button', { name: 'Abrir Archivo' })
    await openButton.waitFor({ state: 'visible', timeout: 4000 })
    report.openableCardCount += 1
    await page.getByRole('button', { name: 'Seguir escuchando' }).click()
    await openButton.waitFor({ state: 'hidden', timeout: 4000 })
  }
  if (report.cardCount !== 4 || report.openableCardCount !== 4) {
    throw new Error(`whisper_board_incomplete_${report.cardCount}_${report.openableCardCount}`)
  }
  await page.screenshot({ path: join(artifactDirectory, 'validate-whispers.png'), fullPage: true })

  const playableCard = page.locator('article').filter({ hasNot: page.getByText('Susurro codificado') }).first()
  report.openedHeadline = (await playableCard.locator('h2').innerText()).replace(/\s+/g, ' ').trim()
  await playableCard.getByRole('button', { name: 'Investigar este Susurro' }).click()
  await page.getByRole('button', { name: 'Abrir Archivo' }).click()
  const titleCardButton = page.getByRole('button', { name: 'Pulsar para continuar' })
  const failureAlert = page.locator('[role=alert]')
  const suggestedActionCards = page.locator('.suggested-action-card')
  await Promise.race([
    suggestedActionCards.first().waitFor({ state: 'visible', timeout: 720000 }),
    page.getByRole('button', { name: 'Completar texto' }).waitFor({ state: 'visible', timeout: 720000 }),
    failureAlert.waitFor({ state: 'visible', timeout: 720000 }),
  ])
  if (await failureAlert.isVisible().catch(() => false)) {
    const failureText = await failureAlert.innerText()
    throw new Error(`opening_failed:${failureText.slice(0, 240)}`)
  }
  if (await titleCardButton.isVisible().catch(() => false)) {
    await titleCardButton.click({ timeout: 4000, force: true }).catch(() => undefined)
  }
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 8000)
  await suggestedActionCards.first().waitFor({ timeout: 20000 })
  report.archiveTitle = report.archiveTitle ?? (await page.locator('h1').first().innerText())
  const suggestedActions = suggestedActionCards
  report.suggestedActionCount = await suggestedActions.count()
  const dockBox = await page.locator('.archive-reply-desk-dock').boundingBox()
  let visibleSuggestedActionCount = 0
  for (let actionIndex = 0; actionIndex < report.suggestedActionCount; actionIndex += 1) {
    const actionBox = await suggestedActions.nth(actionIndex).boundingBox()
    if (!actionBox) {
      continue
    }
    const isCoveredByDock = dockBox !== null && actionBox.y + actionBox.height / 2 > dockBox.y
    if (actionBox.height > 8 && !isCoveredByDock) {
      visibleSuggestedActionCount += 1
    }
  }
  report.visibleSuggestedActionCount = visibleSuggestedActionCount
  report.hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  const archiveText = await page.locator('main').innerText()
  if (hasForbiddenMarkup(archiveText) || /faro que cuenta de más/i.test(report.archiveTitle ?? '')) {
    report.hasForbiddenMarkup = true
    throw new Error('archive_has_forbidden_markup')
  }
  await page.screenshot({ path: join(artifactDirectory, 'validate-archive-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(artifactDirectory, 'validate-archive-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  if (report.visibleSuggestedActionCount < 1) {
    throw new Error('no_visible_suggested_action')
  }
  report.sentSuggestedAction = (await suggestedActions.first().innerText()).replace(/\s+/g, ' ').trim()
  await suggestedActions.first().click()
  await page.getByRole('button', { name: 'Enviar acción' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: join(artifactDirectory, 'validate-turn-wait.png'), fullPage: true })
  await page.getByRole('button', { name: 'Completar texto' }).waitFor({ timeout: 360000 }).catch(() => null)
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 4000)
  const logText = await page.locator('.archive-reading-column, main').innerText()
  report.directorAnswered = /AKYRION DECLARA|director|Cursos de acción/i.test(logText) && logText.length > archiveText.length
  if (!report.directorAnswered) {
    report.directorAnswered = await suggestedActions.count() >= 1
  }
  await page.screenshot({ path: join(artifactDirectory, 'validate-turn-after.png'), fullPage: true })
} catch (error) {
  report.failedAt = error instanceof Error ? error.message : String(error)
  await page.screenshot({ path: join(artifactDirectory, 'validate-failure.png'), fullPage: true }).catch(() => undefined)
} finally {
  report.consoleFailures = consoleFailures
  report.assetFailures = assetFailures
  writeFileSync(join(artifactDirectory, 'validate-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (report.failedAt || report.hasForbiddenMarkup || report.cardCount !== 4) {
    process.exit(1)
  }
}
