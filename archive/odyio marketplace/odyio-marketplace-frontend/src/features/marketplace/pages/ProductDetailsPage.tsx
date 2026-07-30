import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Clock, FileText, ImageIcon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../../../shared/components/Breadcrumbs'
import { useViewMode } from '../../../shared/store/viewModeStore'
import { getProductById } from '../api/productApi'
import { useActiveClinic } from '../clinic/hooks/useActiveClinic'
import { useQuotationDraft } from '../quotation/store/quotationDraftStore'
import { earSideLabels, type ProductImage } from '../types/product'
import { resolveMarketplaceAssetUrl } from '../utils/assetUrls'
import ErrorState from '../../../shared/components/ErrorState'
import LoadingState from '../../../shared/components/LoadingState'

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-base font-medium text-slate-950">{value || '-'}</dd>
    </div>
  )
}

function orderImages(images: ProductImage[]) {
  return [...images].sort((left, right) => {
    if (left.primary !== right.primary) {
      return left.primary ? -1 : 1
    }

    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder
    }

    return left.id.localeCompare(right.id)
  })
}

export default function ProductDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useQuotationDraft()
  const { mode } = useViewMode()
  const { activeClinic } = useActiveClinic()
  const [quotationMessage, setQuotationMessage] = useState<string | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set())

  const productQuery = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id as string),
    enabled: Boolean(id),
  })
  const product = productQuery.data
  const orderedImages = useMemo(() => orderImages(product?.images ?? []), [product?.images])
  const selectedImage =
    orderedImages.find((image) => image.id === selectedImageId) ??
    product?.primaryImage ??
    orderedImages[0] ??
    null
  const selectedImageFailed = selectedImage ? failedImageIds.has(selectedImage.id) : false
  const selectedImageSrc = resolveMarketplaceAssetUrl(selectedImage?.imageUrl)

  useEffect(() => {
    if (!product) {
      return
    }

    setSelectedImageId(product.primaryImage?.id ?? orderedImages[0]?.id ?? null)
    setFailedImageIds(new Set())
  }, [orderedImages, product])

  if (!id) {
    return <ErrorState message="Identifiant produit manquant." />
  }

  if (productQuery.isLoading) {
    return <LoadingState label="Chargement du produit..." />
  }

  if (productQuery.isError || !product) {
    return <ErrorState message="Impossible de charger le detail du produit." />
  }

  const canAddToQuotation = product.active && product.available
  const isClinicMode = mode === 'CLINIC'

  const handleAddToQuotation = () => {
    const result = addProduct(product, activeClinic)
    setQuotationMessage(result.message)
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Catalogue', to: '/clinic/marketplace' },
          { label: product.name },
        ]}
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
          <div>
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {selectedImageSrc && !selectedImageFailed ? (
                <img
                  src={selectedImageSrc}
                  alt={selectedImage.altText?.trim() || `${product.name} - image produit`}
                  className="h-full w-full object-contain p-5"
                  onError={() =>
                    setFailedImageIds((current) => new Set(current).add(selectedImage.id))
                  }
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
                  <ImageIcon className="h-10 w-10 text-slate-400" />
                  <span className="text-sm font-medium">Aucune image disponible</span>
                </div>
              )}
            </div>

            {orderedImages.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {orderedImages.map((image, index) => {
                  const isSelected = image.id === selectedImage?.id
                  const imageFailed = failedImageIds.has(image.id)
                  const imageSrc = resolveMarketplaceAssetUrl(image.imageUrl)

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImageId(image.id)}
                      aria-label={`Afficher l'image ${index + 1} de ${product.name}`}
                      className={[
                        'flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-slate-50 transition',
                        isSelected
                          ? 'border-teal-700 ring-2 ring-teal-100'
                          : 'border-slate-200 hover:border-teal-300',
                      ].join(' ')}
                    >
                      {imageSrc && !imageFailed ? (
                        <img
                          src={imageSrc}
                          alt={image.altText?.trim() || `${product.name} - miniature ${index + 1}`}
                          className="h-full w-full object-contain p-2"
                          onError={() =>
                            setFailedImageIds((current) => new Set(current).add(image.id))
                          }
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              {product.categoryName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product.name}</h1>
            <p className="mt-2 text-slate-600">
              {[product.brand, product.model].filter(Boolean).join(' - ') ||
                'Marque et modele non renseignes'}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <span
              className={[
                'rounded-full px-3 py-1 text-sm font-medium',
                product.available ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {product.available ? 'Disponible' : 'Indisponible'}
            </span>
            <span
              className={[
                'rounded-full px-3 py-1 text-sm font-medium',
                product.active ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800',
              ].join(' ')}
            >
              {product.active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoItem label="Reference" value={product.reference} />
          <InfoItem label="Fournisseur" value={product.supplierName} />
          <InfoItem label="Categorie" value={product.categoryName} />
          <InfoItem label="Cote oreille" value={earSideLabels[product.earSide]} />
        </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-950">
              <FileText className="h-5 w-5 text-teal-700" />
              <h2 className="text-xl font-semibold">Description</h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
              {product.description || 'Aucune description renseignee.'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-950">
              <FileText className="h-5 w-5 text-teal-700" />
              <h2 className="text-xl font-semibold">Specifications techniques</h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
              {product.technicalSpecs || 'Aucune specification technique renseignee.'}
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          {isClinicMode ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Demande de devis</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ajoutez ce produit a une demande de devis en cours. Une demande ne peut contenir que
                des produits du meme fournisseur.
              </p>
              {quotationMessage ? (
                <p className="mt-3 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                  {quotationMessage}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleAddToQuotation}
                disabled={!canAddToQuotation}
                className="mt-4 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Ajouter à la demande de devis
              </button>
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Creation: {new Date(product.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Mise a jour: {new Date(product.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          <Link
            to="/clinic/marketplace"
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Revenir au catalogue
          </Link>
        </aside>
      </section>
    </div>
  )
}
