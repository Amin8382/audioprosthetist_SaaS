export type EarSide = 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NA'

export type ProductImage = {
  id: string
  imageUrl: string
  altText?: string | null
  displayOrder: number
  primary: boolean
}

export type ProductImageInput = {
  altText?: string | null
  displayOrder?: number
  primary?: boolean
}

export type ProductImageMetadata = {
  altText?: string | null
  displayOrder?: number
  primary?: boolean
}

export type ProductImageUploadInput = ProductImageInput & {
  file: File
}

export type Product = {
  id: string
  supplierId: string
  supplierName: string
  categoryId: string
  categoryName: string
  name: string
  brand?: string | null
  model?: string | null
  reference?: string | null
  description?: string | null
  technicalSpecs?: string | null
  earSide: EarSide
  available: boolean
  active: boolean
  primaryImage?: ProductImage | null
  images: ProductImage[]
  createdAt: string
  updatedAt: string
}

export type ProductPayload = {
  supplierId: string
  categoryId: string
  name: string
  brand?: string
  model?: string
  reference?: string
  description?: string
  technicalSpecs?: string
  earSide: EarSide
  available: boolean
}

export const earSideLabels: Record<EarSide, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droite',
  BILATERAL: 'Bilateral',
  NA: 'Non applicable',
}
