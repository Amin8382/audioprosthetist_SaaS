import { useSyncExternalStore } from 'react'
import type { Product } from '../../types/product'
import type { QuotationDraft, QuotationDraftLine } from '../types/quotationRequest'

const storageKey = 'odyio-marketplace-quotation-draft'

const emptyDraft: QuotationDraft = {
  lines: [],
}

let currentDraft = readDraftFromStorage()
const listeners = new Set<() => void>()

function readDraftFromStorage(): QuotationDraft {
  if (typeof window === 'undefined') {
    return emptyDraft
  }

  const storedDraft = window.sessionStorage.getItem(storageKey)

  if (!storedDraft) {
    return emptyDraft
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as QuotationDraft
    return {
      clinicId: parsedDraft.clinicId,
      clinicName: parsedDraft.clinicName,
      supplierId: parsedDraft.supplierId,
      supplierName: parsedDraft.supplierName,
      lines: Array.isArray(parsedDraft.lines) ? parsedDraft.lines : [],
    }
  } catch {
    return emptyDraft
  }
}

function writeDraft(nextDraft: QuotationDraft) {
  currentDraft = nextDraft

  if (typeof window !== 'undefined') {
    if (nextDraft.lines.length === 0) {
      window.sessionStorage.removeItem(storageKey)
    } else {
      window.sessionStorage.setItem(storageKey, JSON.stringify(nextDraft))
    }
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentDraft
}

function normalizeQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : 1
}

function mapProductToDraftLine(product: Product): QuotationDraftLine {
  return {
    productId: product.id,
    productName: product.name,
    productReference: product.reference,
    quantity: 1,
    lineNotes: '',
  }
}

export type AddProductResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

type DraftClinic = {
  clinicId: string
  clinicName: string
}

export function useQuotationDraft() {
  const draft = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    draft,
    lineCount: draft.lines.length,
    selectedQuantityCount: draft.lines.reduce((count, line) => count + line.quantity, 0),
    addProduct(product: Product, clinic?: DraftClinic | null): AddProductResult {
      if (!clinic?.clinicId) {
        return {
          ok: false,
          message: 'Sélectionnez une clinique pour créer des demandes de devis.',
        }
      }

      if (!product.active || !product.available) {
        return {
          ok: false,
          message: 'Seuls les produits actifs et disponibles peuvent etre ajoutes.',
        }
      }

      if (draft.clinicId && draft.clinicId !== clinic.clinicId) {
        return {
          ok: false,
          message: 'Ce brouillon est lie a une autre clinique.',
        }
      }

      if (draft.supplierId && draft.supplierId !== product.supplierId) {
        return {
          ok: false,
          message: 'Une demande de devis ne peut contenir que des produits du même fournisseur.',
        }
      }

      const existingLine = draft.lines.find((line) => line.productId === product.id)

      if (existingLine) {
        writeDraft({
          ...draft,
          lines: draft.lines.map((line) =>
            line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        })

        return {
          ok: true,
          message: 'Quantite augmentee dans la demande de devis.',
        }
      }

      writeDraft({
        clinicId: clinic.clinicId,
        clinicName: clinic.clinicName,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        lines: [...draft.lines, mapProductToDraftLine(product)],
      })

      return {
        ok: true,
        message: 'Produit ajoute a la demande de devis.',
      }
    },
    updateLine(productId: string, changes: Partial<Pick<QuotationDraftLine, 'quantity' | 'lineNotes'>>) {
      writeDraft({
        ...draft,
        lines: draft.lines.map((line) =>
          line.productId === productId
            ? {
                ...line,
                ...changes,
                quantity:
                  changes.quantity === undefined ? line.quantity : normalizeQuantity(changes.quantity),
              }
            : line,
        ),
      })
    },
    removeLine(productId: string) {
      const nextLines = draft.lines.filter((line) => line.productId !== productId)
      writeDraft(
        nextLines.length === 0
          ? emptyDraft
          : {
              ...draft,
              lines: nextLines,
            },
      )
    },
    clearDraft() {
      writeDraft(emptyDraft)
    },
  }
}
