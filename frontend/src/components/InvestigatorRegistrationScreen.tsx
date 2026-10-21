import { ArrowLeft, ArrowRight, Stamp, UserFocus } from '@phosphor-icons/react'
import { ToggleGroup } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import type { InvestigatorGender, InvestigatorRegistration } from '../game_state/chronicle_state'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { PresentationTitleCard } from './PresentationTitleCard'
import { TypewriterNarration } from './TypewriterNarration'

type RegistrationStepName =
  | 'full_name'
  | 'gender'
  | 'birth_date'
  | 'origin_place'
  | 'residence_place'
  | 'relational_anchor'

const registrationStepNames: RegistrationStepName[] = [
  'full_name',
  'gender',
  'birth_date',
  'origin_place',
  'residence_place',
  'relational_anchor',
]

const maximumNameLength = 60
const maximumPlaceLength = 80
const writtenNamePattern = /^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u
const minimumAdultAge = 18
const oldestAcceptedBirthYear = 1900

type RegistrationDraft = {
  fullName: string
  gender: InvestigatorGender | null
  birthDay: string
  birthMonth: string
  birthYear: string
  originPlace: string
  residencePlace: string
  anchorKind: 'person' | 'uprooted'
  anchorPersonName: string
  anchorBondDescription: string
}

const emptyRegistrationDraft: RegistrationDraft = {
  fullName: '',
  gender: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  originPlace: '',
  residencePlace: '',
  anchorKind: 'person',
  anchorPersonName: '',
  anchorBondDescription: '',
}

function collapseWhitespace(rawText: string): string {
  return rawText.replace(/\s+/g, ' ').trim()
}

function validateBirthDate(registrationDraft: RegistrationDraft): string | null {
  const birthDateCopy = spanishInterfaceCopy.registration.birthDate
  const day = Number.parseInt(registrationDraft.birthDay, 10)
  const month = Number.parseInt(registrationDraft.birthMonth, 10)
  const year = Number.parseInt(registrationDraft.birthYear, 10)
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return birthDateCopy.invalidDate
  }
  const candidateDate = new Date(year, month - 1, day)
  const isRealCalendarDate =
    candidateDate.getFullYear() === year && candidateDate.getMonth() === month - 1 && candidateDate.getDate() === day
  if (!isRealCalendarDate) {
    return birthDateCopy.invalidDate
  }
  if (year < oldestAcceptedBirthYear) {
    return birthDateCopy.tooOld
  }
  if (candidateDate.getTime() > Date.now()) {
    return birthDateCopy.inTheFuture
  }
  const today = new Date()
  const latestAdultBirthDate = new Date(today.getFullYear() - minimumAdultAge, today.getMonth(), today.getDate())
  if (candidateDate.getTime() > latestAdultBirthDate.getTime()) {
    return birthDateCopy.tooYoung
  }
  return null
}

function validateRegistrationStep(stepName: RegistrationStepName, registrationDraft: RegistrationDraft): string | null {
  const registrationCopy = spanishInterfaceCopy.registration
  switch (stepName) {
    case 'full_name':
      if (collapseWhitespace(registrationDraft.fullName).length < 2) {
        return registrationCopy.fullName.tooShort
      }
      return writtenNamePattern.test(collapseWhitespace(registrationDraft.fullName))
        ? null
        : registrationCopy.onlyWrittenCharacters
    case 'gender':
      return registrationDraft.gender ? null : registrationCopy.gender.missingChoice
    case 'birth_date':
      return validateBirthDate(registrationDraft)
    case 'origin_place':
      if (collapseWhitespace(registrationDraft.originPlace).length < 2) {
        return registrationCopy.originPlace.tooShort
      }
      return writtenNamePattern.test(collapseWhitespace(registrationDraft.originPlace))
        ? null
        : registrationCopy.onlyWrittenCharacters
    case 'residence_place':
      if (collapseWhitespace(registrationDraft.residencePlace).length < 2) {
        return registrationCopy.residencePlace.tooShort
      }
      return writtenNamePattern.test(collapseWhitespace(registrationDraft.residencePlace))
        ? null
        : registrationCopy.onlyWrittenCharacters
    case 'relational_anchor':
      if (registrationDraft.anchorKind === 'uprooted') {
        return null
      }
      {
        const isPersonNameMissing = collapseWhitespace(registrationDraft.anchorPersonName).length < 2
        const isBondMissing = collapseWhitespace(registrationDraft.anchorBondDescription).length < 2
        if (isPersonNameMissing && isBondMissing) {
          return registrationCopy.relationalAnchor.incompletePerson
        }
        if (isPersonNameMissing) {
          return registrationCopy.relationalAnchor.missingPersonName
        }
        if (isBondMissing) {
          return registrationCopy.relationalAnchor.missingBond
        }
        return writtenNamePattern.test(collapseWhitespace(registrationDraft.anchorPersonName))
          ? null
          : registrationCopy.onlyWrittenCharacters
      }
  }
}

function describeRecordedValue(stepName: RegistrationStepName, registrationDraft: RegistrationDraft): string | null {
  const registrationCopy = spanishInterfaceCopy.registration
  switch (stepName) {
    case 'full_name':
      return collapseWhitespace(registrationDraft.fullName) || null
    case 'gender':
      return registrationDraft.gender ? registrationCopy.gender.options[registrationDraft.gender] : null
    case 'birth_date': {
      if (validateBirthDate(registrationDraft) !== null) {
        return null
      }
      const monthName = registrationCopy.birthDate.monthNames[Number.parseInt(registrationDraft.birthMonth, 10) - 1]
      return `${Number.parseInt(registrationDraft.birthDay, 10)} de ${monthName} de ${registrationDraft.birthYear}`
    }
    case 'origin_place':
      return collapseWhitespace(registrationDraft.originPlace) || null
    case 'residence_place':
      return collapseWhitespace(registrationDraft.residencePlace) || null
    case 'relational_anchor':
      if (registrationDraft.anchorKind === 'uprooted') {
        return registrationCopy.relationalAnchor.uprootedRecordValue
      }
      return collapseWhitespace(registrationDraft.anchorPersonName)
        ? `${collapseWhitespace(registrationDraft.anchorPersonName)} · ${collapseWhitespace(registrationDraft.anchorBondDescription)}`
        : null
  }
}

function readStepFieldLabel(stepName: RegistrationStepName): string {
  const registrationCopy = spanishInterfaceCopy.registration
  const fieldLabelByStepName: Record<RegistrationStepName, string> = {
    full_name: registrationCopy.fullName.fieldLabel,
    gender: registrationCopy.gender.fieldLabel,
    birth_date: registrationCopy.birthDate.fieldLabel,
    origin_place: registrationCopy.originPlace.fieldLabel,
    residence_place: registrationCopy.residencePlace.fieldLabel,
    relational_anchor: registrationCopy.relationalAnchor.fieldLabel,
  }
  return fieldLabelByStepName[stepName]
}

function readStepQuestion(stepName: RegistrationStepName): string {
  const registrationCopy = spanishInterfaceCopy.registration
  const questionByStepName: Record<RegistrationStepName, string> = {
    full_name: registrationCopy.fullName.question,
    gender: registrationCopy.gender.question,
    birth_date: registrationCopy.birthDate.question,
    origin_place: registrationCopy.originPlace.question,
    residence_place: registrationCopy.residencePlace.question,
    relational_anchor: registrationCopy.relationalAnchor.question,
  }
  return questionByStepName[stepName]
}

const typewrittenCharacterIntervalMilliseconds = 62
const remainingCharactersNoticeThreshold = 15

function RemainingCharactersNotice({ writtenLength, maximumLength }: { writtenLength: number; maximumLength: number }) {
  const remainingCharacterCount = maximumLength - writtenLength
  if (remainingCharacterCount > remainingCharactersNoticeThreshold) {
    return null
  }
  return (
    <span
      className={`mt-1 block text-right font-[family-name:var(--font-dossier)] text-xs ${
        remainingCharacterCount === 0 ? 'text-blood-accent-text' : 'text-paper-muted'
      }`}
      aria-live="polite"
    >
      {spanishInterfaceCopy.registration.remainingCharacters(remainingCharacterCount)}
    </span>
  )
}
const recordSealingMilliseconds = 2700

function TypewrittenRecordValue({ recordedValue }: { recordedValue: string }) {
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [typedCharacterCount, setTypedCharacterCount] = useState(shouldReduceMotion ? recordedValue.length : 0)
  const feedbackCallback = useRef(playInteractionFeedback)

  useEffect(() => {
    feedbackCallback.current = playInteractionFeedback
  }, [playInteractionFeedback])

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }
    const typingIntervalIdentifier = window.setInterval(() => {
      setTypedCharacterCount((previousCount) => {
        if (previousCount >= recordedValue.length) {
          window.clearInterval(typingIntervalIdentifier)
          return previousCount
        }
        if (recordedValue[previousCount] !== ' ') {
          feedbackCallback.current('typewriter_key')
        }
        if (previousCount + 1 === recordedValue.length) {
          window.setTimeout(() => feedbackCallback.current('panel_close'), 140)
        }
        return previousCount + 1
      })
    }, typewrittenCharacterIntervalMilliseconds)
    return () => window.clearInterval(typingIntervalIdentifier)
  }, [recordedValue, shouldReduceMotion])

  return (
    <>
      <span aria-hidden="true">
        {recordedValue.slice(0, typedCharacterCount)}
        {typedCharacterCount < recordedValue.length ? <span className="intake-record-typing-head" /> : null}
      </span>
      <span className="visually-hidden-text">{recordedValue}</span>
    </>
  )
}

type InvestigatorRegistrationScreenProperties = {
  onRegistrationCompleted: (investigatorRegistration: InvestigatorRegistration) => void
}

export function InvestigatorRegistrationScreen({ onRegistrationCompleted }: InvestigatorRegistrationScreenProperties) {
  const registrationCopy = spanishInterfaceCopy.registration
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationCardVisible, setIsPresentationCardVisible] = useState(true)
  const [registrationDraft, setRegistrationDraft] = useState<RegistrationDraft>(emptyRegistrationDraft)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [highestReachedStepIndex, setHighestReachedStepIndex] = useState(0)
  const [isQuestionCompletionRequested, setIsQuestionCompletionRequested] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [validationOccurrenceCount, setValidationOccurrenceCount] = useState(0)
  const stepFieldContainer = useRef<HTMLDivElement>(null)
  const [completedRegistrationAwaitingSeal, setCompletedRegistrationAwaitingSeal] =
    useState<InvestigatorRegistration | null>(null)
  const recordSerialNumber = useMemo(
    () => `${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000) + 1000)}-V`,
    [],
  )

  const currentStepName = registrationStepNames[currentStepIndex]
  const isLastStep = currentStepIndex === registrationStepNames.length - 1

  useEffect(() => {
    if (isPresentationCardVisible) {
      return
    }
    const firstField = stepFieldContainer.current?.querySelector<HTMLElement>('input, select, button[role="radio"]')
    firstField?.focus({ preventScroll: true })
  }, [currentStepIndex, isPresentationCardVisible])

  const updateRegistrationDraft = (changedFields: Partial<RegistrationDraft>, shouldPlayKeySound = true) => {
    setRegistrationDraft((previousDraft) => ({ ...previousDraft, ...changedFields }))
    setValidationMessage(null)
    if (shouldPlayKeySound) {
      playInteractionFeedback('typewriter_key')
    }
  }

  const advanceRegistration = (submitEvent?: FormEvent) => {
    submitEvent?.preventDefault()
    const stepValidationMessage = validateRegistrationStep(currentStepName, registrationDraft)
    if (stepValidationMessage !== null) {
      setValidationMessage(stepValidationMessage)
      setValidationOccurrenceCount((previousCount) => previousCount + 1)
      playInteractionFeedback('rejection')
      return
    }
    setRegistrationDraft((previousDraft) => ({
      ...previousDraft,
      fullName: collapseWhitespace(previousDraft.fullName),
      originPlace: collapseWhitespace(previousDraft.originPlace),
      residencePlace: collapseWhitespace(previousDraft.residencePlace),
      anchorPersonName: collapseWhitespace(previousDraft.anchorPersonName),
      anchorBondDescription: collapseWhitespace(previousDraft.anchorBondDescription),
    }))
    if (!isLastStep) {
      playInteractionFeedback('confirmation')
      setIsQuestionCompletionRequested(false)
      setCurrentStepIndex((previousIndex) => previousIndex + 1)
      setHighestReachedStepIndex((previousHighest) => Math.max(previousHighest, currentStepIndex + 1))
      return
    }
    if (!registrationDraft.gender) {
      return
    }
    playInteractionFeedback('panel_open')
    setCompletedRegistrationAwaitingSeal({
      fullName: collapseWhitespace(registrationDraft.fullName),
      gender: registrationDraft.gender,
      birthDate: {
        day: Number.parseInt(registrationDraft.birthDay, 10),
        month: Number.parseInt(registrationDraft.birthMonth, 10),
        year: Number.parseInt(registrationDraft.birthYear, 10),
      },
      originPlace: collapseWhitespace(registrationDraft.originPlace),
      residencePlace: collapseWhitespace(registrationDraft.residencePlace),
      relationalAnchor:
        registrationDraft.anchorKind === 'uprooted'
          ? { kind: 'uprooted' }
          : {
              kind: 'person',
              personName: collapseWhitespace(registrationDraft.anchorPersonName),
              bondDescription: collapseWhitespace(registrationDraft.anchorBondDescription),
            },
    })
  }

  useEffect(() => {
    if (!completedRegistrationAwaitingSeal) {
      return
    }
    const stampSoundTimeoutIdentifier = window.setTimeout(() => playInteractionFeedback('stamp_impact'), 1080)
    const sealingTimeoutIdentifier = window.setTimeout(
      () => onRegistrationCompleted(completedRegistrationAwaitingSeal),
      recordSealingMilliseconds,
    )
    return () => {
      window.clearTimeout(stampSoundTimeoutIdentifier)
      window.clearTimeout(sealingTimeoutIdentifier)
    }
  }, [completedRegistrationAwaitingSeal, onRegistrationCompleted, playInteractionFeedback])

  if (isPresentationCardVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={registrationCopy.chapterLabel}
        chapterTitle={registrationCopy.chapterTitle}
        onPresentationFinished={() => setIsPresentationCardVisible(false)}
      />
    )
  }

  if (completedRegistrationAwaitingSeal) {
    return (
      <main id="main-content" className="intake-record-sealing-stage" role="status">
        <div className="intake-record-sealing-folder">
          <p className="font-[family-name:var(--font-dossier)] text-[0.6875rem] font-bold tracking-[0.18em] uppercase opacity-70">
            {registrationCopy.recordNumberLabel} {recordSerialNumber}
          </p>
          <p className="display-title mt-1 text-4xl [overflow-wrap:anywhere]">
            {completedRegistrationAwaitingSeal.fullName}
          </p>
          <dl className="mt-4 flex flex-col gap-1.5 pr-2 pb-14 font-[family-name:var(--font-dossier)] text-sm">
            {registrationStepNames.slice(1).map((stepName, lineIndex) => (
              <div
                key={stepName}
                className="intake-record-sealing-line flex flex-wrap gap-x-2 border-b border-dotted border-black/50 pb-1"
                style={{ '--entrance-order': lineIndex } as CSSProperties}
              >
                <dt className="text-[0.6875rem] tracking-[0.1em] uppercase opacity-70">{readStepFieldLabel(stepName)}</dt>
                <dd className="font-bold [overflow-wrap:anywhere]">{describeRecordedValue(stepName, registrationDraft)}</dd>
              </div>
            ))}
          </dl>
          <p className="intake-record-sealing-stamp">{registrationCopy.recordSealedStamp}</p>
        </div>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-16 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pt-20"
    >
      <form className="flex min-w-0 flex-col" onSubmit={advanceRegistration} noValidate>
        <div className="flex items-baseline justify-between gap-4">
          <p className="dossier-label !text-blood-accent-text">{registrationCopy.visorCaptionLabel}</p>
          <p className="dossier-label">
            {registrationCopy.stepCounter(currentStepIndex + 1, registrationStepNames.length)}
          </p>
        </div>
        <div className="mt-1 flex gap-1.5" aria-hidden="true">
          {registrationStepNames.map((stepName, stepIndex) => (
            <span
              key={stepName}
              className={`h-1.5 flex-1 transition-colors duration-200 ${
                stepIndex <= currentStepIndex ? 'bg-blood-accent' : 'bg-ink-line'
              }`}
            />
          ))}
        </div>

        <div
          key={currentStepName}
          className="narrative-prose mt-6 min-h-[5.5rem] text-[1.375rem] leading-snug"
          onClick={() => setIsQuestionCompletionRequested(true)}
        >
          <TypewriterNarration
            paragraphs={[readStepQuestion(currentStepName)]}
            shouldAnimateReveal
            isImmediateCompletionRequested={isQuestionCompletionRequested}
            onRevealCompleted={() => undefined}
            onRevealProgressed={() => undefined}
          />
        </div>

        <div
          key={`${currentStepName}_${validationOccurrenceCount}`}
          ref={stepFieldContainer}
          className={`entrance-from-below mt-4 ${validationMessage ? 'rejection-shake' : ''}`}
        >
          {currentStepName === 'full_name' ? (
            <label className="block">
              <span className="dossier-label">{registrationCopy.fullName.fieldLabel}</span>
              <input
                type="text"
                className="free-action-field mt-1.5 !font-[family-name:var(--font-dossier)] text-xl"
                value={registrationDraft.fullName}
                maxLength={maximumNameLength}
                placeholder={registrationCopy.fullName.placeholder}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="next"
                aria-invalid={validationMessage !== null}
                aria-describedby="registration-validation-message"
                onChange={(changeEvent) => updateRegistrationDraft({ fullName: changeEvent.target.value })}
              />
              <RemainingCharactersNotice writtenLength={registrationDraft.fullName.length} maximumLength={maximumNameLength} />
            </label>
          ) : null}

          {currentStepName === 'gender' ? (
            <ToggleGroup.Root
              type="single"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              aria-label={registrationCopy.gender.fieldLabel}
              value={registrationDraft.gender ?? ''}
              onValueChange={(chosenGender) => {
                if (chosenGender) {
                  updateRegistrationDraft({ gender: chosenGender as InvestigatorGender }, false)
                  playInteractionFeedback('option_click')
                }
              }}
            >
              {(Object.keys(registrationCopy.gender.options) as InvestigatorGender[]).map((genderOption) => (
                <ToggleGroup.Item
                  key={genderOption}
                  value={genderOption}
                  className="suggested-action-button !grid-cols-1 data-[state=on]:!border-blood-accent-text data-[state=on]:!bg-void-elevated"
                >
                  {registrationCopy.gender.options[genderOption]}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          ) : null}

          {currentStepName === 'birth_date' ? (
            <fieldset
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)] gap-2.5"
              aria-describedby="registration-validation-message"
            >
              <legend className="visually-hidden-text">{registrationCopy.birthDate.fieldLabel}</legend>
              <label className="block min-w-0">
                <span className="dossier-label">{registrationCopy.birthDate.dayLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="free-action-field mt-1.5 text-xl"
                  value={registrationDraft.birthDay}
                  maxLength={2}
                  placeholder="DD"
                  autoComplete="off"
                  onChange={(changeEvent) =>
                    updateRegistrationDraft({ birthDay: changeEvent.target.value.replace(/\D/g, '') })
                  }
                />
              </label>
              <label className="block min-w-0">
                <span className="dossier-label">{registrationCopy.birthDate.monthLabel}</span>
                <select
                  className="free-action-field mt-1.5 h-[52px] text-lg"
                  value={registrationDraft.birthMonth}
                  onChange={(changeEvent) => updateRegistrationDraft({ birthMonth: changeEvent.target.value })}
                >
                  <option value="">—</option>
                  {registrationCopy.birthDate.monthNames.map((monthName, monthIndex) => (
                    <option key={monthName} value={String(monthIndex + 1)}>
                      {monthName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="dossier-label">{registrationCopy.birthDate.yearLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="free-action-field mt-1.5 text-xl"
                  value={registrationDraft.birthYear}
                  maxLength={4}
                  placeholder="AAAA"
                  autoComplete="off"
                  onChange={(changeEvent) =>
                    updateRegistrationDraft({ birthYear: changeEvent.target.value.replace(/\D/g, '') })
                  }
                />
              </label>
            </fieldset>
          ) : null}

          {currentStepName === 'origin_place' || currentStepName === 'residence_place' ? (
            <label className="block">
              <span className="dossier-label">{readStepFieldLabel(currentStepName)}</span>
              <input
                type="text"
                className="free-action-field mt-1.5 text-xl"
                value={currentStepName === 'origin_place' ? registrationDraft.originPlace : registrationDraft.residencePlace}
                maxLength={maximumPlaceLength}
                placeholder={
                  currentStepName === 'origin_place'
                    ? registrationCopy.originPlace.placeholder
                    : registrationCopy.residencePlace.placeholder
                }
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                aria-invalid={validationMessage !== null}
                aria-describedby="registration-validation-message"
                onChange={(changeEvent) =>
                  updateRegistrationDraft(
                    currentStepName === 'origin_place'
                      ? { originPlace: changeEvent.target.value }
                      : { residencePlace: changeEvent.target.value },
                  )
                }
              />
              <RemainingCharactersNotice
                writtenLength={
                  (currentStepName === 'origin_place' ? registrationDraft.originPlace : registrationDraft.residencePlace).length
                }
                maximumLength={maximumPlaceLength}
              />
            </label>
          ) : null}

          {currentStepName === 'relational_anchor' ? (
            <div className="flex flex-col gap-3">
              <ToggleGroup.Root
                type="single"
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                aria-label={registrationCopy.relationalAnchor.fieldLabel}
                value={registrationDraft.anchorKind}
                onValueChange={(chosenKind) => {
                  if (chosenKind) {
                    updateRegistrationDraft({ anchorKind: chosenKind as RegistrationDraft['anchorKind'] }, false)
                    playInteractionFeedback('option_click')
                  }
                }}
              >
                <ToggleGroup.Item
                  value="person"
                  className="suggested-action-button !grid-cols-1 data-[state=on]:!border-blood-accent-text data-[state=on]:!bg-void-elevated"
                >
                  {registrationCopy.relationalAnchor.personOption}
                </ToggleGroup.Item>
                <ToggleGroup.Item
                  value="uprooted"
                  className="suggested-action-button !grid-cols-1 data-[state=on]:!border-blood-accent-text data-[state=on]:!bg-void-elevated"
                >
                  {registrationCopy.relationalAnchor.uprootedOption}
                </ToggleGroup.Item>
              </ToggleGroup.Root>
              {registrationDraft.anchorKind === 'person' ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="dossier-label">{registrationCopy.relationalAnchor.personNameLabel}</span>
                    <input
                      type="text"
                      className="free-action-field mt-1.5 text-lg"
                      value={registrationDraft.anchorPersonName}
                      maxLength={maximumNameLength}
                      placeholder={registrationCopy.relationalAnchor.personNamePlaceholder}
                      autoComplete="off"
                      autoCapitalize="words"
                      spellCheck={false}
                      onChange={(changeEvent) => updateRegistrationDraft({ anchorPersonName: changeEvent.target.value })}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="dossier-label">{registrationCopy.relationalAnchor.bondLabel}</span>
                    <input
                      type="text"
                      className="free-action-field mt-1.5 text-lg"
                      value={registrationDraft.anchorBondDescription}
                      maxLength={maximumPlaceLength}
                      placeholder={registrationCopy.relationalAnchor.bondPlaceholder}
                      autoComplete="off"
                      onChange={(changeEvent) =>
                        updateRegistrationDraft({ anchorBondDescription: changeEvent.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}
              <p className="border-l-2 border-ink-line pl-3 text-xs text-paper-muted">
                {registrationCopy.relationalAnchor.explanation}
              </p>
            </div>
          ) : null}
        </div>

        <p
          id="registration-validation-message"
          className="mt-2 min-h-5 text-sm font-semibold text-blood-accent-text"
          aria-live="polite"
        >
          {validationMessage}
        </p>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="quiet-action-button"
            disabled={currentStepIndex === 0}
            onClick={() => {
              playInteractionFeedback('option_click')
              setValidationMessage(null)
              setIsQuestionCompletionRequested(true)
              setCurrentStepIndex((previousIndex) => Math.max(0, previousIndex - 1))
            }}
          >
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            {registrationCopy.backButton}
          </button>
          <button type="submit" className="primary-action-button">
            {isLastStep ? (
              <>
                <Stamp size={22} weight="fill" aria-hidden="true" />
                {registrationCopy.finishButton}
              </>
            ) : (
              <>
                {registrationCopy.continueButton}
                <ArrowRight size={22} weight="bold" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>

      <aside
        className="intake-record-sheet aged-paper-document relative h-fit min-w-0 -rotate-[0.7deg]"
        aria-label={registrationCopy.recordTitle}
      >
        <span className="intake-record-paperclip" aria-hidden="true" />
        <span className="intake-record-punch-holes" aria-hidden="true" />
        <header className="flex items-start justify-between gap-3 border-b-[3px] border-double border-black/80 pb-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-dossier)] text-[0.625rem] font-bold tracking-[0.2em] uppercase opacity-70">
              {registrationCopy.recordAuthorityLine}
            </p>
            <p className="display-title mt-1 text-3xl leading-none">{registrationCopy.recordTitle}</p>
            <p className="mt-1.5 font-[family-name:var(--font-dossier)] text-xs font-bold">
              {registrationCopy.recordNumberLabel} <span className="text-[#8f1027]">{recordSerialNumber}</span>
            </p>
          </div>
          <div className="intake-record-photograph" aria-hidden="true">
            <UserFocus size={38} weight="thin" />
            <span>{registrationCopy.recordPhotographPlaceholder}</span>
          </div>
        </header>
        <dl className="mt-1 flex flex-col">
          {registrationStepNames.map((stepName, stepIndex) => {
            const recordedValue =
              stepIndex !== currentStepIndex && stepIndex <= highestReachedStepIndex
                ? describeRecordedValue(stepName, registrationDraft)
                : null
            return (
              <div key={stepName} className="intake-record-line grid grid-cols-[1.4rem_minmax(0,1fr)] gap-x-2 py-2">
                <span className="font-[family-name:var(--font-dossier)] text-[0.6875rem] font-bold opacity-50" aria-hidden="true">
                  {String(stepIndex + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <dt className="font-[family-name:var(--font-dossier)] text-[0.625rem] tracking-[0.14em] uppercase opacity-70">
                    {readStepFieldLabel(stepName)}
                  </dt>
                  <dd className="min-h-[1.6rem] font-[family-name:var(--font-dossier)] text-[1.0625rem] leading-snug font-bold [overflow-wrap:anywhere]">
                    {recordedValue ? (
                      <TypewrittenRecordValue key={recordedValue} recordedValue={recordedValue} />
                    ) : stepIndex === currentStepIndex ? (
                      <span className="intake-record-waiting-caret" aria-hidden="true" />
                    ) : (
                      <span className="visually-hidden-text">{registrationCopy.recordEmptyValue}</span>
                    )}
                  </dd>
                </div>
              </div>
            )
          })}
        </dl>
        <footer className="mt-3 flex items-end justify-between gap-3">
          <p className="max-w-[11rem] font-[family-name:var(--font-dossier)] text-[0.5625rem] leading-tight uppercase opacity-60">
            {registrationCopy.recordFooterNotice}
          </p>
          <div className="intake-record-barcode" aria-hidden="true" />
        </footer>
      </aside>
    </main>
  )
}
