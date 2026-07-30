import type { SupplierQuotationWorkflowStatus } from '../../quotation/types/quotationRequest'

const tabs: Array<{ value: SupplierQuotationWorkflowStatus; label: string }> = [
  { value: 'TO_PROCESS', label: 'A traiter' },
  { value: 'ANSWERED', label: 'Repondues' },
  { value: 'CANCELLED', label: 'Annulees' },
]

type SupplierWorkflowTabsProps = {
  value: SupplierQuotationWorkflowStatus
  onChange: (value: SupplierQuotationWorkflowStatus) => void
}

export default function SupplierWorkflowTabs({ value, onChange }: SupplierWorkflowTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-pressed={value === tab.value}
          className={[
            'rounded-md px-3 py-2 text-sm font-semibold transition',
            value === tab.value
              ? 'bg-teal-700 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
