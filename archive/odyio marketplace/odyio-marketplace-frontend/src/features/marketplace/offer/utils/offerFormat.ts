export function formatAmount(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-'
  }

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
