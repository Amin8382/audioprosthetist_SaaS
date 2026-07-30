import { httpClient } from '../../../shared/api/httpClient'
import type { Category } from '../types/category'

export async function getCategories() {
  const response = await httpClient.get<Category[]>('/categories')
  return response.data
}
