import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  getModeHomePath,
  setMode,
  useViewMode,
  type ViewMode,
} from '../store/viewModeStore'

type ModeRouteProps = {
  mode: ViewMode
  children: React.ReactNode
}

export function ModeRoute({ mode, children }: ModeRouteProps) {
  useEffect(() => {
    setMode(mode)
  }, [mode])

  return children
}

export function ModeHomeRedirect() {
  const { mode } = useViewMode()
  return <Navigate to={getModeHomePath(mode)} replace />
}

export function LegacyProductRedirect() {
  const { id } = useParams()
  return <Navigate to={`/clinic/marketplace/products/${id}`} replace />
}

export function LegacyQuotationRequestRedirect() {
  const { id } = useParams()
  return <Navigate to={`/clinic/quotation-requests/${id}`} replace />
}
