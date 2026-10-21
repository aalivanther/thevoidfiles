const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../frontend/node_modules/typescript')
const root = path.resolve(__dirname, '../..')

function loader(overrides = {}) {
  const cache = new Map()
  function load(filename) {
    filename = path.resolve(root, filename)
    if (Object.hasOwn(overrides, filename)) return overrides[filename]
    if (cache.has(filename)) return cache.get(filename)
    const module = { exports: {} }
    cache.set(filename, module.exports)
    const source = fs.readFileSync(filename, 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
    const requireModule = (name) => {
      if (!name.startsWith('.')) return require(name)
      const base = path.resolve(path.dirname(filename), name)
      const target = [base, `${base}.ts`, `${base}.tsx`].find((file) => Object.hasOwn(overrides, file) || fs.existsSync(file))
      return load(target)
    }
    vm.runInThisContext(`(function(require,module,exports){${result.outputText}\n})`, { filename })(requireModule, module, module.exports)
    cache.set(filename, module.exports)
    return module.exports
  }
  return load
}
const scene = { sceneIdentifier: 'station', placeName: 'Estación', tensionTierName: 'quiet', presentPersons: [], perceivedPointsOfInterest: [], suggestedActions: [], openInteractivePieceIdentifiers: [] }
const localInvestigator = { operationalFunds: 999, personalFunds: 0, worldClockMinutes: 999, seriousWoundsSuffered: 0, belongingUnits: {}, placeName: 'Anterior', level: 1, investigatorName: 'Ana' }
function confirmedTurn(version, amount, balance, ending = null) {
  return {
    turnIdentifier: `turn_${version}`, actionKey: `action_${version}`, resultingStateVersion: version,
    witnessedOriginIdentifiers: [], investigatorEntry: { voice: 'investigator_entry', attemptedSteps: [], declaredPlanStepCount: 1 },
    directorEntries: [{ voice: 'director_narration', markedParagraphs: ['La estación conserva el registro confirmado.'] }],
    planStepDispositions: [], planContinuationQuestion: null, resourceCosts: [],
    confirmedEffects: [{ kind: 'operational_funds_spent', amount, resultingAmount: balance }],
    relationshipChanges: [], stagingEvents: [], presentedInteractivePieces: [], interactivePieceStatusChanges: [],
    grantedLivedExperienceFlagNames: [], nextScenePresentation: scene, archiveOutcome: ending,
  }
}
function fixture() {
  const archive = { archiveCaseIdentifier: 'different_case', whisperIdentifier: 'station_rumor', archiveTitle: 'La estación vacía', archiveNumberLabel: '002' }
  const opening = { archive, archiveRun: { stateVersion: 1 }, openingResolution: { openingEntries: [], firstScenePresentation: scene, initialRelationshipLevels: [] }, investigatorResources: { placeName: 'Estación', worldClockMinutes: 60, operationalFunds: 100, seriousWoundCount: 0, belongingUnits: [] }, belongingDefinitions: [] }
  const current = { archive, opening, archiveRun: { archiveRunIdentifier: 'run', stateVersion: 3 } }
  const history = { archiveRun: current.archiveRun, turns: [confirmedTurn(2, 40, 60), confirmedTurn(3, 10, 50)].map((turn) => ({ actionKey: turn.actionKey, resolution: { dispositionName: 'resolved', confirmedTurn: turn } })) }
  return { current, history }
}

test('recovery rebuilds resources from committed history and rejects incomplete history', () => {
  const { rebuildArchiveFromConfirmedHistory } = loader()('frontend/src/game_service/archive_recovery.ts')
  const { current, history } = fixture()
  const restored = rebuildArchiveFromConfirmedHistory(current, history, localInvestigator, (text) => text)
  assert.equal(restored.investigator.operationalFunds, 50)
  assert.equal(restored.investigator.worldClockMinutes, 60)
  assert.equal(restored.archiveRun.stateVersion, 2)
  assert.equal(restored.archiveRun.archiveCaseIdentifier, 'different_case')
  assert.equal(restored.confirmedTurnCount, 2)
  history.turns[0].resolution.confirmedTurn.confirmedEffects.push({ kind: 'personal_funds_spent', amount: 20 })
  const withSpentFunds = rebuildArchiveFromConfirmedHistory(current, history, { ...localInvestigator, personalFunds: 80 }, text => text, 2)
  assert.equal(withSpentFunds.investigator.personalFunds, 80)
  assert.throws(() => rebuildArchiveFromConfirmedHistory(current, { ...history, turns: history.turns.slice(1) }, localInvestigator, (text) => text), /archive_recovery_conflict/)
})

test('closed chapters retain actual identity, facts and closure through JSON persistence', () => {
  const load = loader()
  const { rebuildArchiveFromConfirmedHistory } = load('frontend/src/game_service/archive_recovery.ts')
  const { retainClosedArchiveChapter, readArchiveChapters } = load('frontend/src/game_state/archive_chapters.ts')
  const { current, history } = fixture()
  history.turns[1].resolution.confirmedTurn.archiveOutcome = { kind: 'archive_ended_alive', objectiveResults: [{ visibleText: 'Registro recuperado', wasAchieved: true }], performanceRatingName: 'satisfactory', countsAsSanctionedClosure: true }
  const restored = rebuildArchiveFromConfirmedHistory(current, history, localInvestigator, (text) => text)
  const state = { ...restored, chosenWhisperIdentifier: 'station_rumor', investigatorProgression: { resolvedArchiveCount: 0 }, moduleRecords: {} }
  const persisted = JSON.parse(JSON.stringify(retainClosedArchiveChapter(state)))
  const chapters = readArchiveChapters(persisted)
  assert.equal(chapters.length, 1)
  assert.equal(chapters[0].chapterTitle, 'La estación vacía')
  assert.equal(chapters[0].writingStateName, 'written')
  assert.ok(chapters[0].summaryParagraphs.includes('Registro recuperado'))
  assert.equal(persisted.moduleRecords.case_journal.caseworkByArchiveSequence['1'].archiveTitle, 'La estación vacía')
  assert.equal(readArchiveChapters({ ...persisted, chosenWhisperIdentifier: null }).length, 1)
  assert.equal(retainClosedArchiveChapter(persisted).archiveChapters.length, 1)
})

test('pending assistance survives reload, keeps its key and is scoped to a profile and archive', () => {
  const saved = new Map()
  global.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } }
  let note = { directorKindName: 'game_service', profileIdentifier: 'one', archiveCaseIdentifier: 'case_one' }
  const overrides = { [path.join(root, 'frontend/src/game_service/archive_director_run_note.ts')]: { readArchiveDirectorRunNote: () => note } }
  const requests = loader(overrides)('frontend/src/game_state/pending_archive_request.ts')
  const pending = { kind: 'interactive_piece_assistance', assistanceRequest: { actionKey: 'help_123', expectedStateVersion: 2, interactivePieceIdentifier: 'lock', requestedLevelName: 'hint', isScopeLimitedToThisPieceConfirmed: true } }
  requests.storePendingArchiveRequest(pending)
  const reloaded = loader(overrides)('frontend/src/game_state/pending_archive_request.ts')
  assert.deepEqual(reloaded.readPendingArchiveRequest(), pending)
  note = { ...note, profileIdentifier: 'two' }
  assert.equal(reloaded.readPendingArchiveRequest(), null)
  note = { ...note, profileIdentifier: 'one' }
  reloaded.clearPendingArchiveRequest('unrelated')
  assert.deepEqual(reloaded.readPendingArchiveRequest(), pending)
  reloaded.clearPendingArchiveRequest('help_123')
  assert.equal(reloaded.readPendingArchiveRequest(), null)
})

test('remote adapter preserves confirmed resources and stale request versions', async () => {
  global.window = { setTimeout: (callback) => { callback(); return 0 } }
  let sentAction
  let sentAssistance
  const note = { directorKindName: 'game_service', profileIdentifier: 'profile', archiveCaseIdentifier: 'case', stateVersionOffset: 1 }
  const overrides = {
    [path.join(root, 'frontend/src/game_state/chronicle_state.tsx')]: { readLatestChronicleState: () => ({ investigator: localInvestigator, investigatorRegistration: null }) },
    [path.join(root, 'frontend/src/game_service/archive_director_run_note.ts')]: { readArchiveDirectorRunNote: () => note },
    [path.join(root, 'frontend/src/game_service/game_service_presence.ts')]: {},
    [path.join(root, 'frontend/src/game_service/case_start_client.ts')]: {},
    [path.join(root, 'frontend/src/game_service/consequence_client.ts')]: {
      resolveInvestigatorActionThroughGameService: async (_, action) => {
        sentAction = action
        return { wasSuccessful: true, value: { dispositionName: 'resolved', confirmedTurn: confirmedTurn(6, 10, 50) } }
      },
      requestInteractivePieceAssistanceThroughGameService: async (_, assistance) => {
        sentAssistance = assistance
        return { wasSuccessful: true, value: { assistanceRecord: { levelName: 'hint', publicHintText: 'Una pista' } } }
      },
    },
  }
  const { createRemoteArchiveDirectorService } = loader(overrides)('frontend/src/game_service/remote_archive_director_service.ts')
  const service = createRemoteArchiveDirectorService({ activeProfileIdentifier: 'profile' })
  const result = await service.resolveInvestigatorAction({ actionKey: 'same_key', expectedStateVersion: 2 }, () => {})
  assert.equal(sentAction.expectedStateVersion, 3)
  assert.equal(result.confirmedTurn.resultingStateVersion, 5)
  assert.equal(result.confirmedTurn.confirmedEffects[0].resultingAmount, 50)
  await service.requestInteractivePieceAssistance({ actionKey: 'same_help_key', expectedStateVersion: 5, interactivePieceIdentifier: 'lock', requestedLevelName: 'hint', isScopeLimitedToThisPieceConfirmed: true })
  assert.equal(sentAssistance.actionKey, 'same_help_key')
  assert.equal(sentAssistance.expectedStateVersion, 6)
})

test('client timeout covers both server phases and transport margin', async () => {
  let requestOptions
  const overrides = { [path.join(root, 'frontend/src/game_service/game_service_client.ts')]: { sendGameServiceRequest: async (_, options) => { requestOptions = options; return { wasSuccessful: false } } } }
  const { resolveInvestigatorActionThroughGameService } = loader(overrides)('frontend/src/game_service/consequence_client.ts')
  await resolveInvestigatorActionThroughGameService('profile', { actionKey: 'timed', expectedStateVersion: 1 })
  const server = fs.readFileSync(path.join(root, 'src/the_void_files/application/use_cases/consequence_directed_turn_confirmation.py'), 'utf8')
  const phaseSeconds = [...server.matchAll(/turn_(?:adjudication|narration)_time_budget_seconds = ([\d.]+)/g)].reduce((sum, match) => sum + Number(match[1]), 0)
  assert.ok(phaseSeconds > 0)
  assert.ok(requestOptions.timeoutMilliseconds >= phaseSeconds * 1000 + 30000)
})

test('pending plan cursor lands on the next real step and drops a stray eight', () => {
  const { advancePendingActionPlan } = loader()('frontend/src/game_state/archive_run_state.ts')
  const step = (stepIdentifier, actionText) => ({
    stepIdentifier,
    actionText,
    conditionText: null,
    originSuggestedActionIdentifier: null,
    wasTextEditedByPlayer: false,
    declaredResourceCost: null,
  })
  const plan = (steps) => ({ steps, executedStepCount: 0 })
  const turn = (planStepDispositions, compositionOriginName = 'own_words') => ({
    archiveOutcome: null,
    planStepDispositions,
    investigatorEntry: { attemptedSteps: [{ compositionOriginName }] },
  })

  const afterQuestion = advancePendingActionPlan(
    plan([step('step_preguntar', 'preguntar'), step('step_8', '8'), step('step_registrar', 'registrar')]),
    turn([
      { stepIdentifier: 'step_preguntar', dispositionName: 'executed' },
      { stepIdentifier: 'step_registrar', dispositionName: 'left_pending' },
    ]),
  )
  assert.notEqual(afterQuestion, null)
  assert.equal(afterQuestion.executedStepCount, 2)
  assert.equal(afterQuestion.steps[afterQuestion.executedStepCount].actionText, 'registrar')

  const afterThree = advancePendingActionPlan(
    plan([step('step_A', 'A'), step('step_B', 'B'), step('step_C', 'C'), step('step_8', '8')]),
    turn([
      { stepIdentifier: 'step_A', dispositionName: 'executed' },
      { stepIdentifier: 'step_B', dispositionName: 'executed' },
      { stepIdentifier: 'step_C', dispositionName: 'executed' },
    ]),
  )
  assert.equal(afterThree, null)

  const beforePending = advancePendingActionPlan(
    plan([step('step_A', 'A'), step('step_8', '8'), step('step_B', 'B'), step('step_C', 'C'), step('step_D', 'D')]),
    turn([
      { stepIdentifier: 'step_A', dispositionName: 'executed' },
      { stepIdentifier: 'step_B', dispositionName: 'executed' },
      { stepIdentifier: 'step_C', dispositionName: 'executed' },
      { stepIdentifier: 'step_D', dispositionName: 'left_pending' },
    ]),
  )
  assert.notEqual(beforePending, null)
  assert.equal(beforePending.executedStepCount, 4)
  assert.equal(beforePending.steps[beforePending.executedStepCount].actionText, 'D')

  const piecePlan = plan([step('step_A', 'A')])
  const pieceAttempt = advancePendingActionPlan(piecePlan, turn([], 'interactive_piece_attempt'))
  assert.notEqual(pieceAttempt, null)
  assert.equal(pieceAttempt.executedStepCount, 0)
})

test('atlas marks only walked places and keeps the residence when nothing has been visited', () => {
  const { buildWorldAtlasMarkers } = loader()('frontend/src/components/world_atlas/world_atlas_markers.ts')

  function atlasChronicle(visitedPlaceNames, options = {}) {
    return {
      chosenWhisperIdentifier: options.whisper ?? null,
      investigator: { placeName: options.placeName ?? 'Calle del Farol 4' },
      investigatorProgression: { investigatedWhisperIdentifiers: options.investigated ?? [] },
      archiveRun: {
        visitedPlaces: visitedPlaceNames.map((placeName) => ({ sceneIdentifier: 'scene', placeName })),
      },
    }
  }

  const identifiersOf = (markers) => markers.map((marker) => marker.identifier)

  const atHome = buildWorldAtlasMarkers(atlasChronicle([]), 'Calle del Farol 4')
  assert.deepEqual(identifiersOf(atHome), ['residence'])
  const residence = atHome.find((marker) => marker.identifier === 'residence')
  assert.equal(residence.markerName, 'Calle del Farol 4')
  assert.equal(residence.kind, 'residence')

  const puntaVisit = 'Punta Ánimas · Muelle viejo'
  const atPunta = buildWorldAtlasMarkers(
    atlasChronicle([puntaVisit], { whisper: 'lighthouse_counts_one_more', placeName: puntaVisit }),
    'Calle del Farol 4',
  )
  const puntaMarkers = atPunta.filter((marker) => marker.identifier === 'punta_animas')
  assert.equal(puntaMarkers.length, 1)
  assert.equal(puntaMarkers[0].kind, 'visited_place')
  assert.equal(puntaMarkers[0].knowledge, 'visited')
  assert.notEqual(puntaMarkers[0].mapPoint, null)
  assert.equal(puntaMarkers[0].lastVisitText, 'El registro dice que está aquí ahora.')
  assert.equal(atPunta.some((marker) => marker.identifier.startsWith('case-walked-place')), false)

  const oldPier = buildWorldAtlasMarkers(atlasChronicle(['Muelle viejo']), 'Calle del Farol 4')
  assert.equal(oldPier.some((marker) => marker.identifier === 'residence'), true)
  assert.equal(oldPier.some((marker) => marker.identifier === 'punta_animas'), false)
  const pierMarker = oldPier.find((marker) => marker.markerName === 'Muelle viejo')
  assert.ok(pierMarker)
  assert.equal(pierMarker.mapPoint, null)

  const animasOnly = buildWorldAtlasMarkers(atlasChronicle(['Ánimas']), 'Calle del Farol 4')
  assert.equal(animasOnly.some((marker) => marker.identifier === 'punta_animas'), false)
  const animasMarker = animasOnly.find((marker) => marker.markerName === 'Ánimas')
  assert.ok(animasMarker)
  assert.equal(animasMarker.mapPoint, null)

  const atCabral = buildWorldAtlasMarkers(
    atlasChronicle(['Puerto Cabral'], {
      whisper: 'lighthouse_counts_one_more',
      investigated: ['lighthouse_counts_one_more'],
    }),
    'Calle del Farol 4',
  )
  assert.deepEqual(identifiersOf(atCabral), ['residence', 'cabral_harbor'])
  assert.equal(atCabral.find((marker) => marker.identifier === 'cabral_harbor').kind, 'visited_place')

  const lighthouseWithoutHarbor = buildWorldAtlasMarkers(
    atlasChronicle([], {
      whisper: 'lighthouse_counts_one_more',
      investigated: ['lighthouse_counts_one_more'],
    }),
    'Calle del Farol 4',
  )
  assert.equal(lighthouseWithoutHarbor.some((marker) => marker.identifier === 'cabral_harbor'), false)

  const uncharted = buildWorldAtlasMarkers(atlasChronicle(['Marca sin leyenda']), 'Calle del Farol 4')
  assert.deepEqual(identifiersOf(uncharted), ['residence', 'uncharted_mark'])
  const unchartedMark = uncharted.find((marker) => marker.identifier === 'uncharted_mark')
  assert.equal(unchartedMark.kind, 'visited_place')
  assert.notEqual(unchartedMark.mapPoint, null)
  assert.equal(uncharted.some((marker) => marker.identifier.startsWith('case-walked-place')), false)
})

test('a repeated alphabet letter does not lengthen the caesar wheel', () => {
  const { decipherTextThroughWheel } = loader()(
    'frontend/src/components/archive_chat_engine/interactive_pieces/interactive_piece_working_values.ts',
  )
  const specification = JSON.parse(
    fs.readFileSync(path.join(root, 'content/synthetic_cases/lighthouse_counts_one_more/case_specification.json'), 'utf8'),
  )
  const publicState = specification.interactive_pieces[1].public_definition.public_state
  const decodedText = decipherTextThroughWheel(
    {
      widgetKindName: 'cipher_wheel',
      alphabetLetters: publicState.alphabet_letters.concat(['A']),
      cipheredText: publicState.ciphered_text,
      wheelInscriptionText: publicState.wheel_inscription_text,
    },
    9,
  )
  assert.equal(decodedText.startsWith('ERAN DIEZ.'), true)
})

test('the lighthouse arrival is kept only for that whisper', () => {
  const { readWitnessedOriginsFromArchiveRun } = loader()('frontend/src/demonstration/case_journal_data.ts')
  const archiveRun = {
    witnessedOrigins: [{ originIdentifier: 'llegada', placeName: 'Archivo', worldClockMinutes: 10 }],
  }
  const otherCase = readWitnessedOriginsFromArchiveRun(archiveRun, true, 'otro_caso')
  assert.deepEqual(
    otherCase.map((witnessedOrigin) => witnessedOrigin.originIdentifier),
    ['llegada'],
  )
  const lighthouseCase = readWitnessedOriginsFromArchiveRun(archiveRun, true, 'lighthouse_counts_one_more')
  assert.deepEqual(
    lighthouseCase.map((witnessedOrigin) => witnessedOrigin.originIdentifier),
    ['archive_opening', 'llegada'],
  )
  assert.equal(lighthouseCase[0].placeName, 'Punta Ánimas · Muelle viejo')
  assert.equal(lighthouseCase[0].worldClockMinutes, 192)
  assert.deepEqual(readWitnessedOriginsFromArchiveRun(archiveRun, false, 'lighthouse_counts_one_more'), [])
})

test('the journal names the latest relationship band for that person', () => {
  const { readJournalRelationLevelText } = loader()('frontend/src/components/case_journal/journal_relation_level.ts')
  assert.equal(readJournalRelationLevelText('lighthouse_keeper', []).startsWith('Sin nivel conocido'), true)
  const relationshipPulses = [
    { personIdentifier: 'lighthouse_keeper', resultingQualitativeBandName: 'barely_known' },
    { personIdentifier: 'otra', resultingQualitativeBandName: 'unconditional' },
    { personIdentifier: 'lighthouse_keeper', resultingQualitativeBandName: 'trusted' },
  ]
  assert.equal(readJournalRelationLevelText('lighthouse_keeper', relationshipPulses), 'Confianza ganada')
  assert.equal(readJournalRelationLevelText('nadie', relationshipPulses).startsWith('Sin nivel conocido'), true)
})
