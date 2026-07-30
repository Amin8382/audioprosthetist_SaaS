import { AlertTriangle } from 'lucide-react'

type ErrorStateProps = {
  title?: string
  message?: string
}

export default function ErrorState({
  title = 'Une erreur est survenue',
  message = "Impossible de charger les donnees demandees.",
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-red-800">{message}</p>
        </div>
      </div>
    </div>
  )
}
