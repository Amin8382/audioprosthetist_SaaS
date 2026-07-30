import { useState } from 'react'
import { ArrowRight, CheckCircle2, CircleSlash, ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useViewMode } from '../../../shared/store/viewModeStore'
import { useActiveClinic } from '../clinic/hooks/useActiveClinic'
import { useQuotationDraft } from '../quotation/store/quotationDraftStore'
import type { Product } from '../types/product'
import { earSideLabels } from '../types/product'
import { resolveMarketplaceAssetUrl } from '../utils/assetUrls'

type ProductCardProps = {
  product: Product
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value || '-'}</dd>
    </div>
  )
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useQuotationDraft()
  const { mode } = useViewMode()
  const { activeClinic } = useActiveClinic()
  const [message, setMessage] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const canAddToQuotation = product.active && product.available
  const isClinicMode = mode === 'CLINIC'
  const primaryImage =
    product.primaryImage ?? product.images?.find((image) => image.primary) ?? product.images?.[0]
  const imageSrc = resolveMarketplaceAssetUrl(primaryImage?.imageUrl)
  const showImage = Boolean(imageSrc) && !imageFailed

  const handleAddToQuotation = () => {
    const result = addProduct(product, activeClinic)
    setMessage(result.message)
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <div className="flex flex-1 flex-col gap-4">
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {showImage ? (
            <img
              src={imageSrc ?? undefined}
              alt={primaryImage?.altText?.trim() || `${product.name} - image produit`}
              className="h-full w-full object-contain p-4"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
              <ImageIcon className="h-8 w-8 text-slate-400" />
              <span className="text-xs font-medium">Image produit indisponible</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-7 text-slate-950">{product.name}</h2>
            <span
              className={[
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                product.available
                  ? 'bg-teal-50 text-teal-800'
                  : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {product.available ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <CircleSlash className="h-3.5 w-3.5" />
              )}
              {product.available ? 'Disponible' : 'Indisponible'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[product.brand, product.model].filter(Boolean).join(' - ') ||
              'Marque et modele non renseignes'}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow label="Fournisseur" value={product.supplierName} />
          <DetailRow label="Categorie" value={product.categoryName} />
          <DetailRow label="Cote oreille" value={earSideLabels[product.earSide]} />
          <DetailRow label="Reference" value={product.reference} />
        </dl>
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-slate-50 p-2 text-sm text-slate-700">{message}</p>
      ) : null}

      <div className="mt-5 grid gap-2">
        {isClinicMode ? (
          <button
            type="button"
            onClick={handleAddToQuotation}
            disabled={!canAddToQuotation}
            className="inline-flex items-center justify-center rounded-md border border-teal-700 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:border-slate-200 disabled:text-slate-400"
          >
            Ajouter à la demande de devis
          </button>
        ) : null}
        <Link
          to={`/clinic/marketplace/products/${product.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          Voir les détails
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}
