import { z } from 'zod'
import type { QuotationRequestCreateRequest } from '../types/quotationRequest'

const nullableOptionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()

export const quotationRequestLineSchema = z.object({
  productId: z.string().uuid('Produit invalide'),
  quantity: z.coerce.number().int('La quantite doit etre un entier').min(1, 'La quantite minimale est 1'),
  lineNotes: nullableOptionalText,
})

export const quotationRequestSchema = z.object({
  clinicId: z.string().min(1, 'La clinique est requise').uuid('UUID clinique invalide'),
  supplierId: z.string().min(1, 'Le fournisseur est requis').uuid('UUID fournisseur invalide'),
  clinicNotes: nullableOptionalText,
  requestedDeliveryDate: optionalDate,
  lines: z.array(quotationRequestLineSchema).min(1, 'Ajoutez au moins un produit a la demande.'),
})

export type QuotationRequestFormValues = z.input<typeof quotationRequestSchema>

export function toQuotationRequestPayload(values: QuotationRequestFormValues): QuotationRequestCreateRequest {
  const parsed = quotationRequestSchema.parse(values)

  return {
    clinicId: parsed.clinicId,
    supplierId: parsed.supplierId,
    clinicNotes: parsed.clinicNotes ?? null,
    requestedDeliveryDate: parsed.requestedDeliveryDate ?? null,
    lines: parsed.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      lineNotes: line.lineNotes ?? null,
    })),
  }
}
