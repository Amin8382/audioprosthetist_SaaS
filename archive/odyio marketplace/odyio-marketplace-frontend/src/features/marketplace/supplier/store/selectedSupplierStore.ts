import { useSyncExternalStore } from 'react'

const storageKey = 'odyio-marketplace-selected-supplier'

let currentSupplierId = readSupplierIdFromStorage()
const listeners = new Set<() => void>()

function readSupplierIdFromStorage() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(storageKey) ?? ''
}

function writeSupplierId(supplierId: string) {
  currentSupplierId = supplierId

  if (typeof window !== 'undefined') {
    if (supplierId) {
      window.localStorage.setItem(storageKey, supplierId)
    } else {
      window.localStorage.removeItem(storageKey)
    }
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentSupplierId
}

export function getSelectedSupplierId() {
  return currentSupplierId
}

export function setSelectedSupplierId(supplierId: string) {
  writeSupplierId(supplierId)
}

export function clearSelectedSupplier() {
  writeSupplierId('')
}

export function useSelectedSupplier() {
  const selectedSupplierId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    selectedSupplierId,
    setSelectedSupplierId,
    clearSelectedSupplier,
  }
}

export function useSelectedSupplierId() {
  const { selectedSupplierId, setSelectedSupplierId } = useSelectedSupplier()
  return [selectedSupplierId, setSelectedSupplierId] as const
}
