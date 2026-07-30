import { z } from 'zod'
import type { ProductPayload } from '../types/product'

const optionalText = (max?: number) => {
  const base = z.string().trim()
  return max ? base.max(max, `Maximum ${max} caracteres`) : base
}

export const productFormSchema = z.object({
  supplierId: z.string().min(1, 'Le fournisseur est requis').uuid('UUID fournisseur invalide'),
  categoryId: z.string().min(1, 'La categorie est requise').uuid('UUID categorie invalide'),
  name: z.string().trim().min(1, 'Le nom est requis').max(255, 'Maximum 255 caracteres'),
  brand: optionalText(255),
  model: optionalText(255),
  reference: optionalText(100),
  description: optionalText(),
  technicalSpecs: optionalText(),
  earSide: z.enum(['LEFT', 'RIGHT', 'BILATERAL', 'NA'], {
    message: 'Le cote oreille est requis',
  }),
  available: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export function toProductPayload(values: ProductFormValues): ProductPayload {
  const normalize = (value: string) => {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return {
    supplierId: values.supplierId,
    categoryId: values.categoryId,
    name: values.name.trim(),
    brand: normalize(values.brand),
    model: normalize(values.model),
    reference: normalize(values.reference),
    description: normalize(values.description),
    technicalSpecs: normalize(values.technicalSpecs),
    earSide: values.earSide,
    available: values.available,
  }
}
