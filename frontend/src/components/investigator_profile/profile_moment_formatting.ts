const savedMomentFormatter = new Intl.DateTimeFormat('es-419', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const checkMomentFormatter = new Intl.DateTimeFormat('es-419', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatSavedMoment(savedAtTimestamp: string): string {
  const savedMoment = new Date(savedAtTimestamp)
  return Number.isNaN(savedMoment.getTime()) ? '' : savedMomentFormatter.format(savedMoment)
}

export function formatCheckMoment(checkedAtMilliseconds: number): string {
  return checkMomentFormatter.format(new Date(checkedAtMilliseconds))
}
