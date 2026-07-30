import { useSyncExternalStore } from 'react'

const storageKey = 'odyio-marketplace-selected-clinic'

let currentClinicId = readClinicIdFromStorage()
const listeners = new Set<() => void>()

function readClinicIdFromStorage() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(storageKey) ?? ''
}

function writeClinicId(clinicId: string) {
  currentClinicId = clinicId

  if (typeof window !== 'undefined') {
    if (clinicId) {
      window.localStorage.setItem(storageKey, clinicId)
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
  return currentClinicId
}

export function getSelectedClinicId() {
  return currentClinicId
}

export function setSelectedClinicId(clinicId: string) {
  writeClinicId(clinicId)
}

export function clearSelectedClinic() {
  writeClinicId('')
}

export function useSelectedClinic() {
  const selectedClinicId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    selectedClinicId,
    setSelectedClinicId,
    clearSelectedClinic,
  }
}
