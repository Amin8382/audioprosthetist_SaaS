const apiBaseUrl = import.meta.env.VITE_MARKETPLACE_API_URL

function getBackendOrigin() {
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return ''
  }
}

export function resolveMarketplaceAssetUrl(imageUrl?: string | null) {
  const trimmedUrl = imageUrl?.trim()

  if (!trimmedUrl) {
    return null
  }

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl
  }

  if (trimmedUrl.startsWith('/')) {
    return `${getBackendOrigin()}${trimmedUrl}`
  }

  return trimmedUrl
}
