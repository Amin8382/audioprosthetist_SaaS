import { httpClient } from '../../../shared/api/httpClient'
import type { Clinic } from '../types/clinic'

export async function getClinics() {
  const response = await httpClient.get<Clinic[]>('/clinics')
  return response.data
}
