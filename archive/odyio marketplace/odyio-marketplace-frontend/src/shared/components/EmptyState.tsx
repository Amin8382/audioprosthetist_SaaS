import { SearchX } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  message?: string
}

export default function EmptyState({
  title = 'Aucun resultat',
  message = 'Aucun element ne correspond aux criteres actuels.',
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <SearchX className="mx-auto h-8 w-8 text-slate-400" />
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  )
}
