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

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.emulateMedia({ reducedMotion: 'reduce' })
const report = {
  archiveTitle: null,
  suggestedActionCount: 0,
  visibleSuggestedActionCount: 0,
  sentSuggestedAction: null,
  directorAnswered: false,
  hasForbiddenMarkup: false,
  hasHorizontalOverflow: false,
  viewportChecks: [],
  consoleErrors: [],
  failedAt: null,
}

page.on('pageerror', (error) => report.consoleErrors.push(error.message))

async function verifyViewport(width) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  const actions = page.locator('.suggested-action-card')
  const count = await actions.count()
  let visibleCount = 0
  for (let index = 0; index < count; index += 1) {
    if (await actions.nth(index).isVisible()) visibleCount += 1
  }
  report.viewportChecks.push({ width, hasHorizontalOverflow, suggestedActionCount: count, visibleSuggestedActionCount: visibleCount })
  report.hasHorizontalOverflow ||= hasHorizontalOverflow
  if (hasHorizontalOverflow || count === 0 || visibleCount !== count) throw new Error(`Invalid layout at ${width}px`)
}

try {
  await page.goto(process.env.THE_VOID_FILES_E2E_URL ?? 'http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' })
  await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
  await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
  await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 6000)
  await clickIfVisible(page.getByRole('button', { name: 'Continuar la Crónica' }), 2000)
  const titleCardButton = page.getByRole('button', { name: 'Pulsar para continuar' })
  if (await titleCardButton.isVisible().catch(() => false)) {
    await titleCardButton.click({ force: true, timeout: 4000 }).catch(() => undefined)
  }
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 6000)
  const suggestedActions = page.locator('.suggested-action-card')
  await suggestedActions.first().waitFor({ timeout: 25000 })
  report.archiveTitle = await page.locator('h1').first().innerText()
  report.suggestedActionCount = await suggestedActions.count()
  const dockBox = await page.locator('.archive-reply-desk-dock').boundingBox()
  let visibleSuggestedActionCount = 0
  for (let actionIndex = 0; actionIndex < report.suggestedActionCount; actionIndex += 1) {
    const actionBox = await suggestedActions.nth(actionIndex).boundingBox()
    if (actionBox && actionBox.height > 8 && (dockBox === null || actionBox.y + 12 < dockBox.y)) {
      visibleSuggestedActionCount += 1
    }
  }
  report.visibleSuggestedActionCount = visibleSuggestedActionCount
  report.hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  const beforeText = await page.locator('main').innerText()
  report.hasForbiddenMarkup = /&[A-Za-z]+;|\{\{[a-z_]+\}\}/.test(beforeText)
  report.sentSuggestedAction = (await suggestedActions.first().innerText()).replace(/\s+/g, ' ').trim()
  await suggestedActions.first().click()
  const confirmedResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/consequences/investigator-actions') && response.request().method() === 'POST', { timeout: 400000 })
  await page.getByRole('button', { name: 'Enviar acción' }).click()
  await page.screenshot({ path: join(artifactDirectory, 'validate-turn-wait.png'), fullPage: true })
  const confirmedResponse = await confirmedResponsePromise
  const resolution = await confirmedResponse.json()
  if (!confirmedResponse.ok() || resolution.disposition_name !== 'resolved' || !resolution.confirmed_turn?.action_key) {
    throw new Error('The action was not confirmed by the service')
  }
  const confirmedActionKey = resolution.confirmed_turn.action_key
  await page.locator(`main[data-last-confirmed-action-key="${confirmedActionKey}"]`).waitFor({ timeout: 30000 })
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 5000)
  report.directorAnswered = true
  const afterText = await page.locator('main').innerText()
  report.hasForbiddenMarkup ||= /&[A-Za-z]+;|\{\{[a-z_]+\}\}/.test(afterText)
  await page.screenshot({ path: join(artifactDirectory, 'validate-turn-after.png'), fullPage: true })
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await verifyViewport(width)
    await page.screenshot({ path: join(artifactDirectory, `validate-archive-${width}.png`), fullPage: true })
  }
} catch (error) {
  report.failedAt = error instanceof Error ? error.message : String(error)
  await page.screenshot({ path: join(artifactDirectory, 'validate-turn-failure.png'), fullPage: true }).catch(() => undefined)
} finally {
  writeFileSync(join(artifactDirectory, 'validate-turn-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (report.failedAt || !report.directorAnswered || report.hasForbiddenMarkup || report.hasHorizontalOverflow || report.consoleErrors.length > 0 || report.suggestedActionCount < 5 || report.suggestedActionCount > 12 || report.visibleSuggestedActionCount === 0) {
    process.exit(1)
  }
}
