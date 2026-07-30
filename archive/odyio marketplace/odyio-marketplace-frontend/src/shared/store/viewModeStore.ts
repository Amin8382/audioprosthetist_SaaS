import { useSyncExternalStore } from 'react'

export type ViewMode = 'CLINIC' | 'SUPPLIER'

const storageKey = 'odyio-marketplace-view-mode'
const defaultMode: ViewMode = 'CLINIC'
const allowedModes = new Set<ViewMode>(['CLINIC', 'SUPPLIER'])

let currentMode = readModeFromStorage()
const listeners = new Set<() => void>()

function readModeFromStorage(): ViewMode {
  if (typeof window === 'undefined') {
    return defaultMode
  }

  const storedMode = window.localStorage.getItem(storageKey) as ViewMode | null
  return storedMode && allowedModes.has(storedMode) ? storedMode : defaultMode
}

function writeMode(mode: ViewMode) {
  currentMode = mode

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, mode)
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentMode
}

export function getCurrentViewMode() {
  return currentMode
}

export function getModeHomePath(mode = currentMode) {
  return mode === 'SUPPLIER' ? '/supplier/products' : '/clinic/marketplace'
}

export function setMode(mode: ViewMode) {
  writeMode(mode)
}

export function setClinicMode() {
  writeMode('CLINIC')
}

export function setSupplierMode() {
  writeMode('SUPPLIER')
}

export function useViewMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    mode,
    setMode,
    setClinicMode,
    setSupplierMode,
  }
}
