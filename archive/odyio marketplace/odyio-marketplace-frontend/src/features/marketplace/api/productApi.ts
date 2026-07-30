import { httpClient } from '../../../shared/api/httpClient'
import type {
  EarSide,
  Product,
  ProductImage,
  ProductImageMetadata,
  ProductImageUploadInput,
  ProductPayload,
} from '../types/product'

export type ProductFilters = {
  search?: string
  supplierId?: string
  categoryId?: string
  earSide?: EarSide
  available?: boolean
  active?: boolean
}

export async function getProducts(filters?: ProductFilters) {
  const response = await httpClient.get<Product[]>('/products', { params: filters })
  return response.data
}

export async function getSupplierProducts(
  supplierId: string,
  filters?: Omit<ProductFilters, 'supplierId'>,
) {
  const response = await httpClient.get<Product[]>(`/products/supplier/${supplierId}`, {
    params: filters,
  })
  return response.data
}

export async function getProductById(id: string) {
  const response = await httpClient.get<Product>(`/products/${id}`)
  return response.data
}

export async function createProduct(payload: ProductPayload) {
  const response = await httpClient.post<Product>('/products', payload)
  return response.data
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const response = await httpClient.put<Product>(`/products/${id}`, payload)
  return response.data
}

export async function deactivateProduct(id: string) {
  const response = await httpClient.patch<Product>(`/products/${id}/deactivate`)
  return response.data
}

export async function uploadProductImage(
  productId: string,
  input: ProductImageUploadInput,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
) {
  const formData = new FormData()
  formData.append('file', input.file)

  if (input.altText?.trim()) {
    formData.append('altText', input.altText.trim())
  }

  if (input.displayOrder !== undefined) {
    formData.append('displayOrder', String(input.displayOrder))
  }

  if (input.primary !== undefined) {
    formData.append('primary', String(input.primary))
  }

  const response = await httpClient.post<ProductImage>(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  })
  return response.data
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  metadata: ProductImageMetadata,
) {
  const response = await httpClient.patch<ProductImage>(
    `/products/${productId}/images/${imageId}`,
    metadata,
  )
  return response.data
}

export async function deleteProductImage(productId: string, imageId: string) {
  await httpClient.delete(`/products/${productId}/images/${imageId}`)
}
