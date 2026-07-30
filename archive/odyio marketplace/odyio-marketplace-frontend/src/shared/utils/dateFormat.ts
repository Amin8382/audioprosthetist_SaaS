export function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

export function formatDateOnly(value?: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '-'
}
