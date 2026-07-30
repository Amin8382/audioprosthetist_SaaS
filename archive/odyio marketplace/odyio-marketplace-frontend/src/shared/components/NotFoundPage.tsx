import { ModeHomeRedirect } from './ModeRoute'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">404</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">Page introuvable</h1>
      <p className="mt-3 text-slate-600">Redirection vers le portail actif.</p>
      <ModeHomeRedirect />
    </div>
  )
}
