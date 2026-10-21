import { describe, expect, it } from 'vitest'
import {
  advanceProgression,
  createInitialProgressionState,
  describeProgressionStateKey,
  indexDemoDecisionTree,
  listProgressionOptions,
} from '../../src/portfolio_demo/decision_tree/demo_decision_tree_progression'
import type { DemoProgressionOption } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_progression'
import { enumerateDemoDecisionRoutes } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_routes'
import {
  listNarrativeTexts,
  requiredInteractivePieceWidgetKindNames,
  validateDemoDecisionTree,
} from '../../src/portfolio_demo/decision_tree/demo_decision_tree_validation'
import { lighthouseDemoDecisionTree } from '../../src/portfolio_demo/decision_tree/lighthouse_demo_decision_tree'
import { applyNamelessInvestigatorWording } from '../../src/portfolio_demo/nameless_investigator_wording'
import {
  cloneDemoTree,
  createSuggestedPlanStep,
  openPlayedArchive,
  playActionThroughEngine,
  playAttemptThroughEngine,
  playRouteStepThroughEngine,
  readProjectTextFile,
} from './demo_test_support'
import type { PlayedArchive } from './demo_test_support'

const tree = lighthouseDemoDecisionTree
const routes = enumerateDemoDecisionRoutes(tree)

describe('validador del árbol de decisión de la demo', () => {
  it('acepta el árbol versionado sin problemas y alcanza todos los nodos y finales', () => {
    const validationReport = validateDemoDecisionTree(tree)
    expect(validationReport.problems).toEqual([])
    expect(validationReport.reachableNodeIdentifiers).toEqual(tree.nodes.map((node) => node.nodeIdentifier).sort())
    expect(validationReport.reachableEndingIdentifiers).toEqual(tree.endings.map((ending) => ending.endingIdentifier).sort())
    expect(validationReport.aliveEndingIdentifiers.length).toBeGreaterThan(0)
    expect(validationReport.deathEndingIdentifiers.length).toBeGreaterThan(0)
    expect(validationReport.exploredStateCount).toBeGreaterThan(tree.nodes.length)
  })

  it('cubre los tres tipos de pieza interactiva que soporta el slice', () => {
    const coveredWidgetKindNames = tree.interactivePieces.map((piece) => piece.publicDefinition.publicState.widgetKindName).sort()
    expect(coveredWidgetKindNames).toEqual([...requiredInteractivePieceWidgetKindNames].sort())
  })

  it('detecta un destino colgante', () => {
    const brokenTree = cloneDemoTree()
    const walkAction = brokenTree.actions.find((action) => action.actionIdentifier === 'walk_to_tower_foot')
    if (!walkAction) {
      throw new Error('walk_to_tower_foot missing from tree')
    }
    walkAction.outcome.destination = { kind: 'move_to_node', nodeIdentifier: 'node_that_does_not_exist' }
    expect(validateDemoDecisionTree(brokenTree).problems).toContain(
      'dangling_destination_node:action:walk_to_tower_foot:node_that_does_not_exist',
    )
  })

  it('detecta un nodo inalcanzable y un final inalcanzable', () => {
    const brokenTree = cloneDemoTree()
    for (const actionIdentifier of ['climb_service_staircase', 'climb_without_counting']) {
      const climbingAction = brokenTree.actions.find((action) => action.actionIdentifier === actionIdentifier)
      if (!climbingAction) {
        throw new Error(`${actionIdentifier} missing from tree`)
      }
      climbingAction.outcome.destination = { kind: 'move_to_node', nodeIdentifier: 'keeper_room_after_staircase' }
    }
    const problems = validateDemoDecisionTree(brokenTree).problems
    expect(problems).toContain('unreachable_node:lantern_room')
    expect(problems).toContain('unreachable_node:outer_gallery')
    expect(problems).toContain('unreachable_ending:ending_fixed_shutters')
    expect(problems).toContain('unreachable_ending:death_gallery_fall')
  })

  it('detecta acciones que ningún nodo ofrece', () => {
    const brokenTree = cloneDemoTree()
    const machineRoom = brokenTree.nodes.find((node) => node.nodeIdentifier === 'machine_room')
    if (!machineRoom) {
      throw new Error('machine_room missing from tree')
    }
    machineRoom.actionIdentifiers = machineRoom.actionIdentifiers.filter((identifier) => identifier !== 'climb_service_staircase')
    expect(validateDemoDecisionTree(brokenTree).problems).toContain('action_never_listed:climb_service_staircase')
  })

  it('detecta un estado sin salida', () => {
    const brokenTree = cloneDemoTree()
    const machineRoom = brokenTree.nodes.find((node) => node.nodeIdentifier === 'machine_room')
    if (!machineRoom) {
      throw new Error('machine_room missing from tree')
    }
    const climbAction = brokenTree.actions.find((action) => action.actionIdentifier === 'climb_service_staircase')
    if (!climbAction) {
      throw new Error('climb_service_staircase missing from tree')
    }
    climbAction.visibilityRequiredFlagNames = ['flag_nobody_grants']
    const problems = validateDemoDecisionTree(brokenTree).problems
    expect(problems.some((problem) => problem.startsWith('dead_end_state:'))).toBe(true)
    expect(problems.some((problem) => problem.startsWith('state_cannot_reach_any_ending:'))).toBe(true)
  })

  it('detecta una solución de pieza que incumple sus propias reglas', () => {
    const brokenTree = cloneDemoTree()
    const shutterFrame = brokenTree.interactivePieces.find(
      (piece) => piece.publicDefinition.publicState.widgetKindName === 'ordered_positions',
    )
    if (!shutterFrame || shutterFrame.privateSolution.widgetKindName !== 'ordered_positions') {
      throw new Error('ordered positions piece missing from tree')
    }
    shutterFrame.privateSolution.orderedPieceIdentifiers.reverse()
    expect(
      validateDemoDecisionTree(brokenTree).problems.some((problem) => problem.startsWith('piece_solution_violates_rules:')),
    ).toBe(true)
  })
})

describe('procedencia del contenido', () => {
  it('cada texto del árbol es literal de la especificación del faro o de su suplemento, salvo la sustitución documentada del investigador sin nombre', () => {
    const specificationText = JSON.parse(readProjectTextFile(tree.sourceSpecificationPath)) as unknown
    const supplementText = JSON.parse(
      readProjectTextFile('content/synthetic_cases/lighthouse_counts_one_more/consequence_case_supplement.json'),
    ) as unknown
    const sourceStrings = new Set<string>()
    const collectStrings = (value: unknown) => {
      if (typeof value === 'string') {
        sourceStrings.add(value)
      } else if (Array.isArray(value)) {
        value.forEach(collectStrings)
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(collectStrings)
      }
    }
    collectStrings(specificationText)
    collectStrings(supplementText)
    const wordedSourceStrings = new Set([...sourceStrings].map(applyNamelessInvestigatorWording))
    const missingTexts = listNarrativeTexts(tree).filter(({ text }) => !sourceStrings.has(text) && !wordedSourceStrings.has(text))
    expect(missingTexts).toEqual([])
    const substitutedTexts = listNarrativeTexts(tree).filter(({ text }) => !sourceStrings.has(text))
    expect(substitutedTexts.length).toBeGreaterThan(0)
    expect(substitutedTexts.every(({ text }) => text.includes('Investigador'))).toBe(true)
  })

  it('el árbol ya no deja huecos para el nombre del investigador', () => {
    expect(listNarrativeTexts(tree).filter(({ text }) => /\{\{nombre(?:_completo)?\}\}/.test(text))).toEqual([])
    expect(tree.openingNarrationParagraphs[0]).toContain('La lancha deja al Investigador en el muelle viejo')
    expect(tree.openingNarrationParagraphs[1]).toContain('Luego otro. El Investigador los cuenta sin querer')
  })
})

describe('regla del investigador sin nombre', () => {
  it.each([
    ['{{nombre}} mira su reloj.', 'El Investigador mira su reloj.'],
    ['Luego otro. {{nombre}} los cuenta', 'Luego otro. El Investigador los cuenta'],
    ['La lancha deja a {{nombre_completo}} en el muelle', 'La lancha deja al Investigador en el muelle'],
    ['El reloj de {{nombre}} anda.', 'El reloj del Investigador anda.'],
    ['mientras {{nombre}} prueba.', 'mientras el Investigador prueba.'],
    ['«{{nombre_completo}}», dice {{nombre}}, y nada más.', '«Investigador», dice el Investigador, y nada más.'],
    ['Aquí termina el trabajo de {{nombre}}. Nadie pasó', 'Aquí termina el trabajo del Investigador. Nadie pasó'],
    ['Nadie vio caer a {{nombre}}.', 'Nadie vio caer al Investigador.'],
    ['Una frase sin hueco.', 'Una frase sin hueco.'],
  ])('%s', (originalText, expectedText) => {
    expect(applyNamelessInvestigatorWording(originalText)).toBe(expectedText)
  })
})

function playWholeRoute(routeIndex: number): PlayedArchive {
  return routes[routeIndex].steps.reduce(playRouteStepThroughEngine, openPlayedArchive())
}

describe('rutas del árbol jugadas con el motor y el reductor real del frontend', () => {
  it('hay rutas para todos los finales, todas las acciones y todas las piezas', () => {
    expect(new Set(routes.map((route) => route.endingIdentifier))).toEqual(
      new Set(tree.endings.map((ending) => ending.endingIdentifier)),
    )
    const coveredActionIdentifiers = new Set(
      routes.flatMap((route) => route.steps.flatMap((step) => (step.kind === 'action' ? [step.actionIdentifier] : []))),
    )
    expect([...coveredActionIdentifiers].sort()).toEqual(tree.actions.map((action) => action.actionIdentifier).sort())
    const coveredPieceIdentifiers = new Set(
      routes.flatMap((route) => route.steps.flatMap((step) => (step.kind === 'interactive_piece' ? [step.interactivePieceIdentifier] : []))),
    )
    expect(coveredPieceIdentifiers.size).toBe(tree.interactivePieces.length)
  })

  it.each(routes.map((route, routeIndex) => [route.routeIdentifier, routeIndex] as const))(
    '%s termina en su final y el reductor acepta cada turno',
    (_routeIdentifier, routeIndex) => {
      const route = routes[routeIndex]
      const playedArchive = playWholeRoute(routeIndex)
      const finalOutcome = playedArchive.chronicleState.archiveRun.archiveOutcome
      expect(playedArchive.runState.closedWithEndingIdentifier).toBe(route.endingIdentifier)
      expect(finalOutcome?.kind).toBe(route.isDeathEnding ? 'chronicle_closed_by_death' : 'archive_ended_alive')
      if (finalOutcome?.kind === 'archive_ended_alive') {
        expect(finalOutcome.endingIdentifier).toBe(route.endingIdentifier)
        expect(playedArchive.chronicleState.chronicleClosure).toBeNull()
      } else {
        expect(playedArchive.chronicleState.chronicleClosure).not.toBeNull()
      }
      expect(playedArchive.chronicleState.archiveRun.stateVersion).toBe(playedArchive.runState.stateVersion)
      expect(playedArchive.chronicleState.investigator.worldClockMinutes).toBe(playedArchive.runState.worldClockMinutes)
      expect(playedArchive.chronicleState.investigator.operationalFunds).toBe(playedArchive.runState.operationalFunds)
      expect(playedArchive.chronicleState.investigator.seriousWoundsSuffered).toBe(playedArchive.runState.seriousWoundCount)
    },
  )

  it('la misma ruta produce siempre el mismo resultado', () => {
    routes.forEach((_route, routeIndex) => {
      const firstPlay = playWholeRoute(routeIndex)
      const secondPlay = playWholeRoute(routeIndex)
      const stripActionKeys = (playedArchive: PlayedArchive) =>
        playedArchive.confirmedTurns.map((confirmedTurn) => ({ ...confirmedTurn, actionKey: '' }))
      expect(stripActionKeys(secondPlay)).toEqual(stripActionKeys(firstPlay))
      expect(secondPlay.runState).toEqual(firstPlay.runState)
    })
  })

  it('el motor resuelve cada opción de cada estado alcanzable y el reductor la acepta', () => {
    const index = indexDemoDecisionTree(tree)
    const exploredStateKeys = new Set<string>()
    const pendingArchives: PlayedArchive[] = [openPlayedArchive()]
    let resolvedOptionCount = 0
    while (pendingArchives.length > 0) {
      const playedArchive = pendingArchives.pop() as PlayedArchive
      const stateKey = describeProgressionStateKey(playedArchive.runState)
      if (exploredStateKeys.has(stateKey) || playedArchive.runState.closedWithEndingIdentifier !== null) {
        continue
      }
      exploredStateKeys.add(stateKey)
      const options: DemoProgressionOption[] = listProgressionOptions(index, playedArchive.runState)
      expect(options.length).toBeGreaterThan(0)
      for (const option of options) {
        const nextArchive =
          option.kind === 'action'
            ? playActionThroughEngine(playedArchive, [createSuggestedPlanStep(option.action.actionIdentifier, option.action.visibleText)])
            : playAttemptThroughEngine(
                playedArchive,
                option.piece.publicDefinition.interactivePieceIdentifier,
                option.piece.privateSolution,
              )
        const expectedProgression = advanceProgression(
          playedArchive.runState,
          option.kind === 'action'
            ? { kind: 'action', actionIdentifier: option.action.actionIdentifier }
            : { kind: 'interactive_piece', interactivePieceIdentifier: option.piece.publicDefinition.interactivePieceIdentifier },
          option.outcome,
        )
        expect(nextArchive.runState.nodeIdentifier).toBe(expectedProgression.nodeIdentifier)
        expect(nextArchive.runState.closedWithEndingIdentifier).toBe(expectedProgression.closedWithEndingIdentifier)
        resolvedOptionCount += 1
        pendingArchives.push(nextArchive)
      }
    }
    expect(exploredStateKeys.size).toBeGreaterThan(tree.nodes.length)
    expect(resolvedOptionCount).toBeGreaterThan(exploredStateKeys.size)
  })
})

describe('comportamiento del Director simulado', () => {
  it('las palabras propias que coinciden con una intención del caso se adjudican como esa acción', () => {
    const playedArchive = playActionThroughEngine(openPlayedArchive(), [
      {
        stepIdentifier: 'plan_step_own_words',
        actionText: 'Me acerco a hablar con la mujer de la libreta',
        conditionText: null,
        originSuggestedActionIdentifier: null,
        wasTextEditedByPlayer: false,
        declaredResourceCost: null,
      },
    ])
    expect(playedArchive.runState.takenActionIdentifiers).toEqual(['speak_with_waiting_woman'])
    expect(playedArchive.confirmedTurns[0].investigatorEntry.attemptedSteps[0].compositionOriginName).toBe('own_words')
  })

  it('las palabras propias fuera del árbol reciben una pregunta del Director y no consumen tiempo', async () => {
    const { resolveDemoInvestigatorAction } = await import('../../src/portfolio_demo/decision_tree/demo_decision_tree_engine')
    const playedArchive = openPlayedArchive()
    const turnResult = resolveDemoInvestigatorAction(playedArchive.context, playedArchive.runState, {
      actionKey: 'portfolio_demo_test_unmatched_words',
      expectedStateVersion: 0,
      sceneIdentifier: 'pier_arrival',
      remainingPlanSteps: [
        {
          stepIdentifier: 'plan_step_unmatched',
          actionText: 'Bailo un vals sobre la proa',
          conditionText: null,
          originSuggestedActionIdentifier: null,
          wasTextEditedByPlayer: false,
          declaredResourceCost: null,
        },
      ],
      declaredPlanStepCount: 1,
      alreadyExecutedStepCount: 0,
      isPlayerInsistingAfterDirectorVeto: false,
      referencedInteractivePieceIdentifier: null,
    })
    expect(turnResult.resolution.dispositionName).toBe('question_asked')
    expect(turnResult.runState).toBe(playedArchive.runState)
  })

  it('un plan de varios pasos se detiene al cambiar de escena y pregunta por lo pendiente', () => {
    const playedArchive = playActionThroughEngine(openPlayedArchive(), [
      createSuggestedPlanStep('walk_to_tower_foot', 'Caminar hasta el pie del faro'),
      createSuggestedPlanStep('speak_with_waiting_woman', 'Hablar con la mujer que espera al final del muelle'),
    ])
    const confirmedTurn = playedArchive.confirmedTurns[0]
    expect(confirmedTurn.planStepDispositions.map((disposition) => disposition.dispositionName)).toEqual(['executed', 'left_pending'])
    expect(confirmedTurn.planContinuationQuestion?.questionKindName).toBe('plan_continuation')
    expect(playedArchive.runState.nodeIdentifier).toBe('tower_foot')
  })

  it('un intento fallido anota las reglas incumplidas, avanza el reloj y no resuelve la pieza', () => {
    const atTowerFoot = [
      createSuggestedPlanStep('walk_to_tower_foot', 'Caminar hasta el pie del faro'),
    ].reduce((playedArchive, planStep) => playActionThroughEngine(playedArchive, [planStep]), openPlayedArchive())
    const withLockPresented = playActionThroughEngine(atTowerFoot, [
      createSuggestedPlanStep('inspect_service_door', 'Rodear el faro y revisar la puerta de servicio'),
    ])
    const afterFailedAttempt = playAttemptThroughEngine(withLockPresented, 'interactive_piece_0001', {
      widgetKindName: 'combination_dials',
      chosenSymbols: ['1', '2', '3'],
    })
    const failedTurn = afterFailedAttempt.confirmedTurns[afterFailedAttempt.confirmedTurns.length - 1]
    expect(afterFailedAttempt.runState.solvedPieceIdentifiers).toEqual([])
    expect(afterFailedAttempt.runState.nodeIdentifier).toBe('tower_foot')
    expect(failedTurn.confirmedEffects[0]).toMatchObject({ kind: 'world_clock_advanced', elapsedMinutes: 2 })
    expect(
      afterFailedAttempt.chronicleState.archiveRun.interactivePieceRuntimeStates.interactive_piece_0001.attempts[0].violatedVisibleRuleTexts,
    ).toEqual(['El pestillo solo salta con las tres cifras exactas, leídas de izquierda a derecha.'])
  })

  it('la ayuda de una pieza devuelve el texto del caso para cada nivel', async () => {
    const { readDemoInteractivePieceAssistance } = await import('../../src/portfolio_demo/decision_tree/demo_decision_tree_engine')
    const withLockPresented = [
      createSuggestedPlanStep('walk_to_tower_foot', 'Caminar hasta el pie del faro'),
      createSuggestedPlanStep('inspect_service_door', 'Rodear el faro y revisar la puerta de servicio'),
    ].reduce((playedArchive, planStep) => playActionThroughEngine(playedArchive, [planStep]), openPlayedArchive())
    for (const levelName of ['gentle', 'medium', 'direct'] as const) {
      expect(
        readDemoInteractivePieceAssistance(withLockPresented.context, withLockPresented.runState, {
          actionKey: `portfolio_demo_test_assistance_${levelName}`,
          expectedStateVersion: withLockPresented.runState.stateVersion,
          interactivePieceIdentifier: 'interactive_piece_0001',
          requestedLevelName: levelName,
          isScopeLimitedToThisPieceConfirmed: true,
        })?.publicHintText,
      ).toBe(tree.interactivePieces[0].assistanceHintTextByLevelName[levelName])
    }
  })

  it('oculta el nombre de Renata hasta que se presenta', () => {
    const playedArchive = openPlayedArchive()
    const pierPresentation = playedArchive.chronicleState.archiveRun.currentScenePresentation
    expect(pierPresentation?.presentPersons[0]).toMatchObject({ visibleName: 'La mujer de la libreta', isNameKnown: false })
    const afterSpeaking = playActionThroughEngine(playedArchive, [
      createSuggestedPlanStep('speak_with_waiting_woman', 'Hablar con la mujer que espera al final del muelle'),
    ])
    expect(afterSpeaking.chronicleState.archiveRun.currentScenePresentation?.presentPersons[0]).toMatchObject({
      visibleName: 'Renata Oquendo',
      isNameKnown: true,
    })
  })

  it('la progresión inicial ofrece solo las acciones del muelle', () => {
    const index = indexDemoDecisionTree(tree)
    expect(
      listProgressionOptions(index, createInitialProgressionState(tree)).map((option) =>
        option.kind === 'action' ? option.action.actionIdentifier : option.piece.publicDefinition.interactivePieceIdentifier,
      ),
    ).toEqual(['speak_with_waiting_woman', 'listen_to_boatman_warning', 'pay_boatman_to_wait', 'walk_to_tower_foot'])
  })
})
