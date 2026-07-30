import { z } from 'zod'
import type { SupplierOfferCreateRequest, SupplierOfferUpdateRequest } from '../types/supplierOffer'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()

export const supplierOfferLineSchema = z.object({
  quotationRequestLineId: z.string().uuid('Ligne de demande invalide'),
  unitPrice: z.coerce.number().positive('Le prix unitaire doit etre superieur a 0'),
  lineNotes: optionalText,
})

export const supplierOfferFormSchema = z.object({
  supplierNotes: optionalText,
  deliveryDelayDays: z.coerce
    .number()
    .int('Le delai doit etre un entier')
    .min(0, 'Le delai doit etre superieur ou egal a 0'),
  validUntil: z.string().min(1, 'La date de validite est requise'),
  lines: z.array(supplierOfferLineSchema).min(1, 'Chaque produit demande doit etre valorise'),
})

export type SupplierOfferFormValues = z.input<typeof supplierOfferFormSchema>

export function toSupplierOfferCreatePayload(
  values: SupplierOfferFormValues,
  quotationRequestId: string,
  supplierId: string,
): SupplierOfferCreateRequest {
  const parsed = supplierOfferFormSchema.parse(values)

  return {
    quotationRequestId,
    supplierId,
    supplierNotes: parsed.supplierNotes ?? null,
    deliveryDelayDays: parsed.deliveryDelayDays,
    validUntil: parsed.validUntil,
    lines: parsed.lines.map((line) => ({
      quotationRequestLineId: line.quotationRequestLineId,
      unitPrice: line.unitPrice,
      lineNotes: line.lineNotes ?? null,
    })),
  }
}

export function toSupplierOfferUpdatePayload(
  values: SupplierOfferFormValues,
): SupplierOfferUpdateRequest {
  const parsed = supplierOfferFormSchema.parse(values)

  return {
    supplierNotes: parsed.supplierNotes ?? null,
    deliveryDelayDays: parsed.deliveryDelayDays,
    validUntil: parsed.validUntil,
    lines: parsed.lines.map((line) => ({
      quotationRequestLineId: line.quotationRequestLineId,
      unitPrice: line.unitPrice,
      lineNotes: line.lineNotes ?? null,
    })),
  }
}
