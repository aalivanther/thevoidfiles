import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const artifactDirectory = join(scriptDirectory, 'artifacts')
const applicationAddress = 'http://127.0.0.1:5173/'
const healthAddress = 'http://127.0.0.1:8765/api/health'

mkdirSync(artifactDirectory, { recursive: true })

async function captureStep(page, stepName) {
  const screenshotPath = join(artifactDirectory, `${stepName}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  return screenshotPath
}

async function clickIfVisible(locator, timeoutMilliseconds = 2500) {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMilliseconds })
    await locator.click({ timeout: 4000 })
    return true
  } catch {
    return false
  }
}

async function waitUntilLoadingOverlayClears(page) {
  const loadingNotice = page.getByText('El archivo se abre', { exact: false })
  await loadingNotice.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => undefined)
}

async function dismissPresentationCard(page) {
  const presentationCard = page.getByRole('button', { name: /Pulsar para continuar/i })
  for (let attemptCount = 0; attemptCount < 3; attemptCount += 1) {
    if (!(await clickIfVisible(presentationCard, 1200))) {
      return
    }
    await page.waitForTimeout(250)
  }
}

async function completeTypewriterAndAdvance(page, finishButtonName) {
  const completeTextButton = page.getByRole('button', { name: 'Completar texto' })
  if (await completeTextButton.isVisible().catch(() => false)) {
    await completeTextButton.click()
  }
  const skipNarrationButton = page.getByRole('button', { name: 'Saltar narración' })
  if (await skipNarrationButton.isVisible().catch(() => false)) {
    await skipNarrationButton.click()
    return
  }
  const finishButton = page.getByRole('button', { name: finishButtonName })
  await finishButton.click()
}

async function runEndToEndLoop() {
  const healthResponse = await fetch(healthAddress)
  const health = await healthResponse.json()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    window.sessionStorage.clear()
    window.localStorage.removeItem('the_void_files_cosmic_origin_witnessed')
  })
  const report = {
    health,
    steps: [],
    archiveTitle: null,
    openingNarrationPreview: null,
    suggestedActionCount: 0,
    suggestedActionLabels: [],
    firstTurnNarrationPreview: null,
    failedAt: null,
  }

  const record = async (stepName, extra = {}) => {
    const screenshotPath = await captureStep(page, stepName)
    report.steps.push({
      stepName,
      address: page.url(),
      heading: await page.locator('h1').first().innerText().catch(() => null),
      screenshotPath,
      ...extra,
    })
  }

  try {
    await page.goto(applicationAddress, { waitUntil: 'domcontentloaded' })
    await waitUntilLoadingOverlayClears(page)
    await record('01_boot')

    await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
    await waitUntilLoadingOverlayClears(page)
    await record('02_after_configuration')

    await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
    await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 6000)
    await clickIfVisible(page.getByRole('button', { name: 'Continuar la Crónica' }), 1500)
    await waitUntilLoadingOverlayClears(page)
    await record('03_left_title')

    const isExistingChronicleVisible =
      (await page.getByRole('heading', { name: 'Cuatro Susurros' }).isVisible().catch(() => false)) ||
      (await page.locator('.archive-chat-engine-screen').isVisible().catch(() => false)) ||
      (await page.getByRole('button', { name: 'Continuar la Crónica' }).isVisible().catch(() => false))
    if (isExistingChronicleVisible) {
      await page.getByRole('button', { name: 'Ajustes' }).click()
      await page.getByRole('tab', { name: 'Crónica' }).click()
      await page.getByRole('button', { name: 'Reiniciar la demostración' }).click()
      await page.getByRole('button', { name: 'Pulsar otra vez para borrar la Crónica' }).click()
      await page.waitForTimeout(2200)
      await waitUntilLoadingOverlayClears(page)
      await clickIfVisible(page.getByRole('button', { name: 'Continuar sin configurar' }), 8000)
      await clickIfVisible(page.getByRole('button', { name: 'Saltar introducción' }), 4000)
      await clickIfVisible(page.getByRole('button', { name: 'Abrir la Crónica' }), 8000)
      await waitUntilLoadingOverlayClears(page)
      await record('03b_after_restart')
    }

    await dismissPresentationCard(page)
    await page.getByLabel('Nombre completo').waitFor({ state: 'visible', timeout: 20000 })
    await page.getByLabel('Nombre completo').fill('Marlow Varela')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByText('No binario', { exact: true }).click()
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByLabel('Día').fill('15')
    await page.getByLabel('Mes').selectOption({ label: 'marzo' })
    await page.getByLabel('Año').fill('1990')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByLabel('Lugar de origen').fill('Valparaíso')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByLabel('Residencia actual').fill('Ciudad de México')
    await page.getByRole('button', { name: 'Registrar' }).click()
    await page.getByText('Hay alguien', { exact: true }).click()
    await page.getByLabel('Nombre de esa persona').fill('Renata Oquendo')
    await page.getByLabel('Vínculo').fill('Hermana')
    await page.getByRole('button', { name: 'Sellar la ficha' }).click()
    await record('04_registration_sealed')

    await dismissPresentationCard(page)
    await clickIfVisible(page.getByRole('button', { name: 'Empezar' }), 4000)
    for (let vignetteIndex = 0; vignetteIndex < 12; vignetteIndex += 1) {
      const firstAnswer = page.locator('.suggested-action-button').first()
      await firstAnswer.waitFor({ state: 'visible', timeout: 8000 })
      await firstAnswer.click()
      await page.waitForTimeout(520)
    }
    await page.getByRole('button', { name: 'Aceptar esta lectura' }).waitFor({ state: 'visible', timeout: 12000 })
    await page.getByRole('button', { name: 'Aceptar esta lectura' }).click()
    await record('05_evaluation_accepted')

    await dismissPresentationCard(page)
    await completeTypewriterAndAdvance(page, 'Seguir adelante')
    await record('06_origin_finished')

    await dismissPresentationCard(page)
    await clickIfVisible(page.getByRole('button', { name: 'Saltar narración' }), 4000)
    await clickIfVisible(page.getByRole('button', { name: 'Escuchar los Susurros' }), 4000)
    await record('07_threshold_finished')

    await dismissPresentationCard(page)
    await clickIfVisible(page.getByRole('button', { name: 'Saltar narración' }), 4000)
    await clickIfVisible(page.getByRole('button', { name: 'Responder' }), 4000)
    await page.getByRole('button', { name: 'Responder así' }).first().click()
    const continueToWhispers = page.getByRole('button', { name: 'Escuchar los Susurros' })
    await continueToWhispers.waitFor({ state: 'visible', timeout: 8000 })
    if (await page.getByRole('button', { name: 'Completar texto' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Completar texto' }).click()
    }
    await continueToWhispers.click()
    await record('08_oicnau_finished')

    const isLighthouseGridVisible = async () =>
      page.getByText('Turno de noche en la planta cuatro').isVisible().catch(() => false)
    let generatedOfferReady = false
    for (let offerAttempt = 0; offerAttempt < 16; offerAttempt += 1) {
      await page.goto(`${applicationAddress}#/susurros`, { waitUntil: 'domcontentloaded' })
      await waitUntilLoadingOverlayClears(page)
      const investigateButtons = page.getByRole('button', { name: 'Investigar este Susurro' })
      const appeared = await investigateButtons.first().waitFor({ state: 'visible', timeout: 180000 }).then(() => true).catch(() => false)
      const cardCount = appeared ? await investigateButtons.count() : 0
      if (appeared && cardCount === 1 && !(await isLighthouseGridVisible())) {
        generatedOfferReady = true
        break
      }
      await page.waitForTimeout(20000)
    }
    if (!generatedOfferReady) {
      throw new Error('generated whisper offer did not replace the demonstration grid')
    }
    await record('08b_whispers_ready')
    const playableWhisperButton = page.getByRole('button', { name: 'Investigar este Susurro' }).first()
    await playableWhisperButton.click()
    await page.getByRole('button', { name: 'Abrir Archivo' }).click()
    await record('09_whisper_confirmed')

    const openingFailure = page.getByText('El Archivo no se abrió', { exact: false })
    const archiveScreen = page.locator('.archive-chat-engine-screen')
    await Promise.race([
      archiveScreen.waitFor({ state: 'visible', timeout: 780000 }),
      openingFailure.waitFor({ state: 'visible', timeout: 780000 }).then(async () => {
        throw new Error(`archive opening failed: ${await openingFailure.innerText()}`)
      }),
    ])
    await clickIfVisible(page.getByRole('button', { name: /Pulsar para continuar/i }), 4000)
    await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 4000)
    const archiveHeading = await page.locator('.archive-chat-engine-screen h1').first().innerText()
    report.archiveTitle = archiveHeading
    const openingNarration = await page.locator('.archive-reading-column').innerText().catch(() => '')
    report.openingNarrationPreview = openingNarration.slice(0, 400)
    const suggestedActionButtons = page.locator('[data-suggested-action-identifier]')
    await suggestedActionButtons.first().waitFor({ state: 'visible', timeout: 20000 })
    report.suggestedActionCount = await suggestedActionButtons.count()
    report.suggestedActionLabels = await suggestedActionButtons.allInnerTexts()
    if (report.suggestedActionCount < 1) {
      throw new Error('archive opened without suggested actions')
    }
    await record('10_archive_opened', {
      archiveTitle: report.archiveTitle,
      suggestedActionCount: report.suggestedActionCount,
    })

    const textBeforeTurn = await page.locator('.archive-chat-engine-screen').innerText()
    await suggestedActionButtons.first().click()
    await page.getByRole('button', { name: 'Enviar acción' }).click()
    await page.getByText('Marlow declara', { exact: false }).waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForTimeout(4000)
    await clickIfVisible(page.getByRole('button', { name: 'Completar texto' }), 20000)
    await page.waitForFunction(
      (previousText) => {
        const currentText = document.querySelector('.archive-chat-engine-screen')?.innerText ?? ''
        return currentText.length > previousText.length + 80 && /El Director/i.test(currentText)
      },
      textBeforeTurn,
      { timeout: 360000 },
    )
    const bodyText = await page.locator('.archive-chat-engine-screen').innerText()
    report.firstTurnNarrationPreview = bodyText.slice(-900)
    if (!/El Director/i.test(bodyText)) {
      throw new Error('first turn did not paint director narration')
    }
    await record('11_first_turn_painted')
  } catch (failure) {
    report.failedAt = String(failure)
    await captureStep(page, 'failure')
    writeFileSync(join(artifactDirectory, 'report.json'), JSON.stringify(report, null, 2))
    await browser.close()
    console.error(JSON.stringify(report, null, 2))
    throw failure
  }

  writeFileSync(join(artifactDirectory, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}

await runEndToEndLoop()
