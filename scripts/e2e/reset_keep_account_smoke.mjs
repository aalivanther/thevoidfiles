import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const artifactDirectory = join(scriptDirectory, 'artifacts')
const applicationAddress = 'http://127.0.0.1:8765/'
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
await page.addInitScript(() => {
  window.sessionStorage.clear()
})
const report = {
  heading: null,
  address: null,
  whisperHeadlines: [],
  archiveTitle: null,
  openingNarrationPreview: null,
  suggestedActionCount: 0,
  failedAt: null,
}

try {
  await page.goto(applicationAddress, { waitUntil: 'domcontentloaded' })
  await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
  await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
  await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 6000)
  await clickIfVisible(page.getByRole('button', { name: 'Continuar la Crónica' }), 2000)
  await page.getByRole('heading', { name: 'Cuatro Susurros' }).waitFor({ timeout: 20000 })
  report.heading = await page.locator('h1').first().innerText()
  report.address = page.url()
  report.whisperHeadlines = await page.locator('.whisper-card, [data-whisper-identifier]').evaluateAll((cards) =>
    cards.map((card) => card.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
  )
  if (report.whisperHeadlines.length === 0) {
    report.whisperHeadlines = await page.locator('h2, h3').evaluateAll((headings) =>
      headings.map((heading) => heading.textContent?.trim() ?? '').filter(Boolean),
    )
  }
  await page.screenshot({ path: join(artifactDirectory, 'reset-whispers.png'), fullPage: true })

  const playableCard = page.locator('article').filter({ hasText: 'Luces espectrales en la costa norte' }).first()
  await playableCard.waitFor({ timeout: 8000 })
  await playableCard.getByRole('button', { name: 'Investigar este Susurro' }).click()
  await page.getByRole('button', { name: 'Abrir Archivo' }).click()
  await page.getByRole('button', { name: 'Pulsar para continuar' }).waitFor({ timeout: 720000 })
  report.archiveTitle = await page.locator('h1').first().innerText().catch(() => null)
  await page.screenshot({ path: join(artifactDirectory, 'reset-title-card.png'), fullPage: true })
  await page.getByRole('button', { name: 'Pulsar para continuar' }).click()
  const suggestedActions = page.locator('[data-suggested-action-identifier]')
  await suggestedActions.first().waitFor({ timeout: 20000 })
  report.suggestedActionCount = await suggestedActions.count()
  report.openingNarrationPreview = await page
    .locator('.archive-reading-log, [data-reading-log], main')
    .first()
    .innerText()
    .then((text) => text.slice(0, 500))
    .catch(() => null)
  await page.screenshot({ path: join(artifactDirectory, 'reset-first-open.png'), fullPage: true })
  if (report.archiveTitle && /faro que cuenta de más/i.test(report.archiveTitle)) {
    report.failedAt = 'live_title_is_lighthouse_demo'
  }
} catch (error) {
  report.failedAt = error instanceof Error ? error.message : String(error)
  await page.screenshot({ path: join(artifactDirectory, 'reset-failure.png'), fullPage: true }).catch(() => undefined)
} finally {
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (report.failedAt) {
    process.exit(1)
  }
}
