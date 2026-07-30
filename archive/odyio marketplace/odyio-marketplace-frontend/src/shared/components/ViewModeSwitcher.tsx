import { useNavigate } from 'react-router-dom'
import { setClinicMode, setSupplierMode, useViewMode } from '../store/viewModeStore'

export default function ViewModeSwitcher() {
  const navigate = useNavigate()
  const { mode } = useViewMode()

  const switchToClinic = () => {
    setClinicMode()
    navigate('/clinic/marketplace')
  }

  const switchToSupplier = () => {
    setSupplierMode()
    navigate('/supplier/products')
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
        title="Mode de démonstration — ce sélecteur ne remplace pas l’authentification."
      >
        <button
          type="button"
          onClick={switchToClinic}
          className={[
            'rounded-md px-3 py-1.5 text-sm font-semibold transition',
            mode === 'CLINIC'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-950',
          ].join(' ')}
        >
          Clinique
        </button>
        <button
          type="button"
          onClick={switchToSupplier}
          className={[
            'rounded-md px-3 py-1.5 text-sm font-semibold transition',
            mode === 'SUPPLIER'
              ? 'bg-white text-blue-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-950',
          ].join(' ')}
        >
          Fournisseur
        </button>
      </div>
      <span className="text-xs text-slate-500">
        Mode de démonstration — ce sélecteur ne remplace pas l’authentification.
      </span>
    </div>
  )
}
