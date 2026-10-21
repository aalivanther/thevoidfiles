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
  whisperHeadline: null,
  archiveTitle: null,
  actionsBefore: [],
  actionsAfter: [],
  directorAnswered: false,
  failedAt: null,
}

try {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' })
  await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
  await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
  await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 6000)
  await clickIfVisible(page.getByRole('button', { name: 'Continuar la Crónica' }), 2000)
  await page.getByRole('heading', { name: 'Cuatro Susurros' }).waitFor({ timeout: 25000 })
  const fourthCard = page.locator('article').nth(3)
  report.whisperHeadline = (await fourthCard.locator('h2').innerText()).replace(/\s+/g, ' ').trim()
  await fourthCard.getByRole('button', { name: 'Investigar este Susurro' }).click()
  await page.getByRole('button', { name: 'Abrir Archivo' }).click()
  const suggestedActions = page.locator('.suggested-action-card')
  await Promise.race([
    suggestedActions.first().waitFor({ state: 'visible', timeout: 720000 }),
    page.getByRole('button', { name: 'Completar texto' }).waitFor({ state: 'visible', timeout: 720000 }),
    page.locator('[role=alert]').waitFor({ state: 'visible', timeout: 720000 }),
  ])
  if (await page.locator('[role=alert]').isVisible().catch(() => false)) {
    throw new Error(`opening_failed:${(await page.locator('[role=alert]').innerText()).slice(0, 240)}`)
  }
  const titleCardButton = page.getByRole('button', { name: 'Pulsar para continuar' })
  if (await titleCardButton.isVisible().catch(() => false)) {
    await titleCardButton.click({ force: true, timeout: 4000 }).catch(() => undefined)
  }
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 8000)
  await suggestedActions.first().waitFor({ timeout: 20000 })
  report.archiveTitle = await page.locator('h1').first().innerText()
  report.actionsBefore = await suggestedActions.evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  await page.screenshot({ path: join(artifactDirectory, 'w4-open.png'), fullPage: true })
  await suggestedActions.first().click()
  await page.getByRole('button', { name: 'Enviar acción' }).click()
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 8000)
  await page.getByRole('button', { name: 'Completar texto' }).waitFor({ timeout: 360000 }).catch(() => null)
  await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 5000)
  report.actionsAfter = await suggestedActions.evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  report.directorAnswered = report.actionsAfter.length > 0
  await page.screenshot({ path: join(artifactDirectory, 'w4-after-turn.png'), fullPage: true })
} catch (error) {
  report.failedAt = error instanceof Error ? error.message : String(error)
  await page.screenshot({ path: join(artifactDirectory, 'w4-failure.png'), fullPage: true }).catch(() => undefined)
} finally {
  writeFileSync(join(artifactDirectory, 'w4-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (report.failedAt || !report.directorAnswered) {
    process.exit(1)
  }
}
