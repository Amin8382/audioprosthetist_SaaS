type LoadingStateProps = {
  label?: string
}

export default function LoadingState({ label = 'Chargement en cours...' }: LoadingStateProps) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  )
}
