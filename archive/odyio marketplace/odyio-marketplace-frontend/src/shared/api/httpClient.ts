import axios, { AxiosError } from 'axios'

const baseURL = import.meta.env.VITE_MARKETPLACE_API_URL

if (!baseURL) {
  throw new Error('VITE_MARKETPLACE_API_URL is not configured')
}

export const httpClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>

    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      axiosError.message ??
      'Erreur API inconnue'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Erreur inconnue'
}

export function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404
}
