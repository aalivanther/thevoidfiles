import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
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
await page.route('**/*', async (route) => {
  const headers = { ...route.request().headers(), 'Cache-Control': 'no-cache' }
  await route.continue({ headers })
})
page.on('response', (response) => {
  if (response.status() >= 400 && response.url().includes('/assets/')) {
    console.error(`ASSET_${response.status()} ${response.url()}`)
  }
})

const report = {
  heading: null,
  cardCount: 0,
  cards: [],
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
  if (report.cardCount !== 4) {
    throw new Error(`expected_four_cards_got_${report.cardCount}`)
  }
  for (let cardIndex = 0; cardIndex < report.cardCount; cardIndex += 1) {
    const card = cards.nth(cardIndex)
    const headline = (await card.locator('h2').innerText()).replace(/\s+/g, ' ').trim()
    await card.getByRole('button', { name: 'Investigar este Susurro' }).click()
    const openButton = page.getByRole('button', { name: 'Abrir Archivo' })
    await openButton.waitFor({ state: 'visible', timeout: 4000 })
    const dialogTitle = await page.getByRole('heading').nth(1).innerText().catch(async () => page.locator('[role=dialog] h1, [role=dialog] .display-title').first().innerText())
    report.cards.push({
      index: cardIndex + 1,
      headline,
      dialogTitle,
      openButtonVisible: await openButton.isVisible(),
    })
    await page.screenshot({
      path: join(artifactDirectory, `whisper-card-${cardIndex + 1}.png`),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Seguir escuchando' }).click()
    await openButton.waitFor({ state: 'hidden', timeout: 4000 })
  }
  await page.screenshot({ path: join(artifactDirectory, 'whisper-board.png'), fullPage: true })
} catch (error) {
  report.failedAt = error instanceof Error ? error.message : String(error)
  await page.screenshot({ path: join(artifactDirectory, 'whisper-board-failure.png'), fullPage: true }).catch(() => undefined)
} finally {
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (report.failedAt || report.cardCount !== 4 || report.cards.some((card) => !card.openButtonVisible)) {
    process.exit(1)
  }
}
