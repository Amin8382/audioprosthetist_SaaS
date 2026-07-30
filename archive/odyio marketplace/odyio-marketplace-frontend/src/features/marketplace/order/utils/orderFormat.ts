export function formatOrderMoney(value?: number | null, currency?: string | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-'
  }

  const formattedValue = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return currency ? `${formattedValue} ${currency}` : formattedValue
}

export function getOrderLineCount(order: { lineCount?: number; lines?: unknown[] }) {
  return order.lineCount ?? order.lines?.length ?? 0
}

export function getOrderTotalQuantity(order: {
  totalQuantity?: number
  lines?: Array<{ quantity: number }>
}) {
  return order.totalQuantity ?? order.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0
}
