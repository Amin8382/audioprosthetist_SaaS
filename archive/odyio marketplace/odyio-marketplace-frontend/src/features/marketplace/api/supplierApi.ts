import { httpClient } from '../../../shared/api/httpClient'
import type { Supplier } from '../types/supplier'

export async function getSuppliers() {
  const response = await httpClient.get<Supplier[]>('/suppliers')
  return response.data
}
