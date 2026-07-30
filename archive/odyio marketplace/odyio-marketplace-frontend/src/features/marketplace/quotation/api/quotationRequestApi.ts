import { httpClient } from '../../../../shared/api/httpClient'
import type {
  QuotationRequestCreateRequest,
  QuotationRequestResponse,
  QuotationRequestSummaryResponse,
  QuotationRequestStatus,
  SupplierQuotationWorkflowStatus,
} from '../types/quotationRequest'

export async function createQuotationRequest(payload: QuotationRequestCreateRequest) {
  const response = await httpClient.post<QuotationRequestResponse>('/quotation-requests', payload)
  return response.data
}

export async function sendQuotationRequest(id: string) {
  const response = await httpClient.post<QuotationRequestResponse>(`/quotation-requests/${id}/send`)
  return response.data
}

export async function getQuotationRequests() {
  const response = await httpClient.get<QuotationRequestSummaryResponse[]>('/quotation-requests')
  return response.data
}

export async function getQuotationRequestById(id: string) {
  const response = await httpClient.get<QuotationRequestResponse>(`/quotation-requests/${id}`)
  return response.data
}

export async function getQuotationRequestsByClinic(
  clinicId: string,
  status?: QuotationRequestStatus,
) {
  const response = await httpClient.get<QuotationRequestSummaryResponse[]>(
    `/quotation-requests/clinic/${clinicId}`,
    { params: status ? { status } : undefined },
  )
  return response.data
}

export async function getQuotationRequestsBySupplier(
  supplierId: string,
  filters?: QuotationRequestStatus | {
    status?: QuotationRequestStatus
    workflowStatus?: SupplierQuotationWorkflowStatus
  },
) {
  const params =
    typeof filters === 'string'
      ? { status: filters }
      : {
          status: filters?.status,
          workflowStatus: filters?.workflowStatus,
        }

  const response = await httpClient.get<QuotationRequestSummaryResponse[]>(
    `/quotation-requests/supplier/${supplierId}`,
    { params },
  )
  return response.data
}

export async function getSupplierScopedQuotationRequest(
  supplierId: string,
  quotationRequestId: string,
) {
  const response = await httpClient.get<QuotationRequestResponse>(
    `/quotation-requests/supplier/${supplierId}/${quotationRequestId}`,
  )
  return response.data
}

export async function cancelQuotationRequest(id: string) {
  const response = await httpClient.patch<QuotationRequestResponse>(`/quotation-requests/${id}/cancel`)
  return response.data
}
