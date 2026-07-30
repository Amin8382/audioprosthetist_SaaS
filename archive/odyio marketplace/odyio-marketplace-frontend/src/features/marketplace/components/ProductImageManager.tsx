import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ImageIcon, Save, Star, Trash2, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '../../../shared/api/httpClient'
import ErrorState from '../../../shared/components/ErrorState'
import SuccessMessage from '../../../shared/components/SuccessMessage'
import { useConfirmDialog } from '../../../shared/hooks/useConfirmDialog'
import {
  deleteProductImage,
  updateProductImage,
  uploadProductImage,
} from '../api/productApi'
import type { ProductImage } from '../types/product'
import { resolveMarketplaceAssetUrl } from '../utils/assetUrls'

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxImageSize = 5 * 1024 * 1024

type PendingUploadStatus = 'ready' | 'uploading' | 'uploaded' | 'failed'

type PendingImage = {
  temporaryId: string
  file: File
  previewUrl: string | null
  altText: string
  displayOrder: number
  primary: boolean
  status: PendingUploadStatus
  progress: number | null
  errorMessage?: string
  canRetry: boolean
}

type ExistingImageMetadata = {
  altText: string
  displayOrder: number
  primary: boolean
}

export type UploadImagesResult = {
  successful: number
  failed: Array<{ fileName: string; message: string }>
  attempted: number
}

export type ProductImageManagerHandle = {
  uploadPendingImages: (productId: string) => Promise<UploadImagesResult>
  hasPendingImages: () => boolean
  hasFailedRetryableImages: () => boolean
}

type ProductImageManagerProps = {
  productId?: string
  productName: string
  existingImages?: ProductImage[]
  canMutate: boolean
  onImagesChanged?: () => Promise<void> | void
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`
  }

  return `${Math.max(1, Math.round(size / 1024))} Ko`
}

function getFileValidationError(file: File) {
  if (file.size === 0) {
    return 'Le fichier sélectionné est vide.'
  }

  if (!allowedImageTypes.has(file.type)) {
    return 'Format non pris en charge. Utilisez JPEG, PNG ou WebP.'
  }

  if (file.size > maxImageSize) {
    return 'Cette image dépasse la taille maximale de 5 Mo.'
  }

  return null
}

function sortImages(images: ProductImage[]) {
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

function createPendingImage(
  file: File,
  displayOrder: number,
  primary: boolean,
): PendingImage {
  const validationError = getFileValidationError(file)

  return {
    temporaryId: crypto.randomUUID(),
    file,
    previewUrl: validationError ? null : URL.createObjectURL(file),
    altText: '',
    displayOrder,
    primary,
    status: validationError ? 'failed' : 'ready',
    progress: null,
    errorMessage: validationError ?? undefined,
    canRetry: !validationError,
  }
}

const statusLabels: Record<PendingUploadStatus, string> = {
  ready: 'Prête',
  uploading: 'Envoi en cours',
  uploaded: 'Téléversée',
  failed: 'Échec',
}

const ProductImageManager = forwardRef<ProductImageManagerHandle, ProductImageManagerProps>(
  function ProductImageManager(
    { productId, productName, existingImages = [], canMutate, onImagesChanged },
    ref,
  ) {
    const queryClient = useQueryClient()
    const fileInputId = useId()
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const { confirm, dialog } = useConfirmDialog()
    const orderedExistingImages = useMemo(() => sortImages(existingImages), [existingImages])
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
    const [existingMetadata, setExistingMetadata] = useState<Record<string, ExistingImageMetadata>>(
      {},
    )
    const [metadataError, setMetadataError] = useState<string | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [summaryMessage, setSummaryMessage] = useState<string | null>(null)
    const [savingImageId, setSavingImageId] = useState<string | null>(null)
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null)
    const pendingImagesRef = useRef<PendingImage[]>([])

    useEffect(() => {
      setExistingMetadata(
        Object.fromEntries(
          orderedExistingImages.map((image) => [
            image.id,
            {
              altText: image.altText ?? '',
              displayOrder: image.displayOrder,
              primary: image.primary,
            },
          ]),
        ),
      )
    }, [orderedExistingImages])

    useEffect(() => {
      pendingImagesRef.current = pendingImages
    }, [pendingImages])

    useEffect(() => {
      return () => {
        pendingImagesRef.current.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl)
          }
        })
      }
    }, [])

    const refreshProductImages = async (targetProductId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', targetProductId] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-products'] }),
        Promise.resolve(onImagesChanged?.()),
      ])
    }

    const uploadPendingImages = async (targetProductId: string): Promise<UploadImagesResult> => {
      const uploadableImages = pendingImages.filter(
        (image) => image.status !== 'uploaded' && image.canRetry,
      )
      const result: UploadImagesResult = {
        successful: 0,
        failed: [],
        attempted: uploadableImages.length,
      }

      for (const pendingImage of uploadableImages) {
        setPendingImages((current) =>
          current.map((image) =>
            image.temporaryId === pendingImage.temporaryId
              ? { ...image, status: 'uploading', progress: null, errorMessage: undefined }
              : image,
          ),
        )

        try {
          await uploadProductImage(
            targetProductId,
            {
              file: pendingImage.file,
              altText: pendingImage.altText,
              displayOrder: pendingImage.displayOrder,
              primary: pendingImage.primary,
            },
            (progressEvent) => {
              if (!progressEvent.total) {
                return
              }

              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
              setPendingImages((current) =>
                current.map((image) =>
                  image.temporaryId === pendingImage.temporaryId ? { ...image, progress } : image,
                ),
              )
            },
          )

          result.successful += 1
          setPendingImages((current) =>
            current.map((image) =>
              image.temporaryId === pendingImage.temporaryId
                ? { ...image, status: 'uploaded', progress: 100, errorMessage: undefined }
                : image,
            ),
          )
        } catch (error) {
          const message = getApiErrorMessage(error)
          result.failed.push({ fileName: pendingImage.file.name, message })
          setPendingImages((current) =>
            current.map((image) =>
              image.temporaryId === pendingImage.temporaryId
                ? { ...image, status: 'failed', progress: null, errorMessage: message, canRetry: true }
                : image,
            ),
          )
        }
      }

      if (result.successful > 0) {
        await refreshProductImages(targetProductId)
      }

      setSummaryMessage(
        result.failed.length > 0
          ? `${result.successful} photo(s) téléversée(s). ${result.failed.length} photo(s) en échec.`
          : result.successful > 0
            ? `${result.successful} photo(s) téléversée(s).`
            : null,
      )

      return result
    }

    useImperativeHandle(
      ref,
      () => ({
        uploadPendingImages,
        hasPendingImages: () =>
          pendingImages.some((image) => image.status !== 'uploaded' && image.canRetry),
        hasFailedRetryableImages: () =>
          pendingImages.some((image) => image.status === 'failed' && image.canRetry),
      }),
    )

    const handleFilesSelected = (files: FileList | null) => {
      if (!files || files.length === 0 || !canMutate) {
        return
      }

      const existingHasPrimary = orderedExistingImages.some((image) => image.primary)
      const pendingHasPrimary = pendingImages.some((image) => image.primary)
      const startOrder = orderedExistingImages.length + pendingImages.length
      const nextImages = Array.from(files).map((file, index) =>
        createPendingImage(
          file,
          startOrder + index,
          !existingHasPrimary && !pendingHasPrimary && index === 0,
        ),
      )

      setPendingImages((current) => [...current, ...nextImages])

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const removePendingImage = (temporaryId: string) => {
      setPendingImages((current) => {
        const removedImage = current.find((image) => image.temporaryId === temporaryId)

        if (removedImage?.previewUrl) {
          URL.revokeObjectURL(removedImage.previewUrl)
        }

        return current.filter((image) => image.temporaryId !== temporaryId)
      })
    }

    const updatePendingImage = (temporaryId: string, changes: Partial<PendingImage>) => {
      setPendingImages((current) =>
        current.map((image) =>
          image.temporaryId === temporaryId ? { ...image, ...changes } : image,
        ),
      )
    }

    const markPendingPrimary = (temporaryId: string) => {
      setPendingImages((current) =>
        current.map((image) => ({ ...image, primary: image.temporaryId === temporaryId })),
      )
    }

    const saveExistingMetadata = async (image: ProductImage, forcePrimary = false) => {
      if (!productId || !canMutate) {
        return
      }

      const metadata = existingMetadata[image.id]
      const displayOrder = Number(metadata?.displayOrder ?? 0)

      if (!Number.isInteger(displayOrder) || displayOrder < 0) {
        setMetadataError("L'ordre d'affichage doit être un entier positif.")
        return
      }

      setMetadataError(null)
      setSavingImageId(image.id)

      try {
        await updateProductImage(productId, image.id, {
          altText: metadata?.altText.trim() || null,
          displayOrder,
          primary: forcePrimary ? true : metadata?.primary,
        })
        await refreshProductImages(productId)
        setSummaryMessage('Métadonnées de la photo mises à jour.')
      } catch (error) {
        setMetadataError(getApiErrorMessage(error))
      } finally {
        setSavingImageId(null)
      }
    }

    const deleteExistingImage = async (image: ProductImage) => {
      if (!productId || !canMutate) {
        return
      }

      const confirmed = await confirm({
        title: 'Supprimer cette photo ?',
        message: 'Cette photo sera définitivement supprimée du produit.',
        confirmLabel: 'Supprimer',
        destructive: true,
      })

      if (!confirmed) {
        return
      }

      setDeleteError(null)
      setDeletingImageId(image.id)

      try {
        await deleteProductImage(productId, image.id)
        await refreshProductImages(productId)
        setSummaryMessage('Photo supprimée.')
      } catch (error) {
        setDeleteError(getApiErrorMessage(error))
      } finally {
        setDeletingImageId(null)
      }
    }

    const uploadFromEditMode = async () => {
      if (!productId) {
        return
      }

      await uploadPendingImages(productId)
    }

    const hasUploadablePendingImages = pendingImages.some(
      (image) => image.status !== 'uploaded' && image.canRetry,
    )

    return (
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {dialog}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Photos du produit</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ajoutez des photos JPEG, PNG ou WebP. Taille maximale : 5 Mo par image.
            </p>
          </div>
          {canMutate ? (
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={fileInputId}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2"
              >
                <ImageIcon className="h-4 w-4" />
                Ajouter des photos
              </label>
              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => handleFilesSelected(event.target.files)}
                className="sr-only"
              />
              {productId && hasUploadablePendingImages ? (
                <button
                  type="button"
                  onClick={() => void uploadFromEditMode()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  <Upload className="h-4 w-4" />
                  Téléverser la sélection
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {summaryMessage ? <SuccessMessage message={summaryMessage} /> : null}
        {metadataError ? <ErrorState title="Mise à jour impossible" message={metadataError} /> : null}
        {deleteError ? <ErrorState title="Suppression impossible" message={deleteError} /> : null}

        {orderedExistingImages.length === 0 && pendingImages.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            Aucune photo enregistrée. Le catalogue affichera un visuel de remplacement.
          </div>
        ) : null}

        {orderedExistingImages.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Photos enregistrées
            </h3>
            <div className="space-y-4">
              {orderedExistingImages.map((image) => {
                const metadata = existingMetadata[image.id] ?? {
                  altText: image.altText ?? '',
                  displayOrder: image.displayOrder,
                  primary: image.primary,
                }
                const imageSrc = resolveMarketplaceAssetUrl(image.imageUrl)

                return (
                  <div
                    key={image.id}
                    className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[140px_1fr_auto]"
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={metadata.altText.trim() || `${productName} - photo produit`}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Texte alternatif</span>
                        <input
                          value={metadata.altText}
                          onChange={(event) =>
                            setExistingMetadata((current) => ({
                              ...current,
                              [image.id]: { ...metadata, altText: event.target.value },
                            }))
                          }
                          placeholder="Décrivez brièvement l’image pour l’accessibilité."
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Ordre</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={metadata.displayOrder}
                          onChange={(event) =>
                            setExistingMetadata((current) => ({
                              ...current,
                              [image.id]: {
                                ...metadata,
                                displayOrder: Number(event.target.value),
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                        />
                      </label>

                      <p className="text-sm text-slate-600 md:col-span-2">
                        {image.primary ? 'Photo principale actuelle.' : 'Photo secondaire.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:flex-col">
                      <button
                        type="button"
                        onClick={() => void saveExistingMetadata(image, true)}
                        disabled={!canMutate || image.primary || savingImageId === image.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:border-slate-200 disabled:text-slate-400"
                      >
                        <Star className="h-4 w-4" />
                        Photo principale
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveExistingMetadata(image)}
                        disabled={!canMutate || savingImageId === image.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:text-slate-400"
                      >
                        <Save className="h-4 w-4" />
                        {savingImageId === image.id ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteExistingImage(image)}
                        disabled={!canMutate || deletingImageId === image.id}
                        aria-label={`Supprimer la photo ${metadata.altText || image.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingImageId === image.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {pendingImages.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Photos sélectionnées localement
            </h3>
            <div className="space-y-4">
              {pendingImages.map((image) => (
                <div
                  key={image.temporaryId}
                  className="grid gap-4 rounded-lg border border-dashed border-teal-200 bg-teal-50/40 p-4 lg:grid-cols-[140px_1fr_auto]"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                    {image.previewUrl ? (
                      <img
                        src={image.previewUrl}
                        alt={image.altText.trim() || `${productName} - aperçu ${image.file.name}`}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-slate-950">{image.file.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatFileSize(image.file.size)} · {statusLabels[image.status]}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Texte alternatif</span>
                        <input
                          value={image.altText}
                          onChange={(event) =>
                            updatePendingImage(image.temporaryId, { altText: event.target.value })
                          }
                          disabled={image.status === 'uploading' || image.status === 'uploaded'}
                          placeholder="Décrivez brièvement l’image pour l’accessibilité."
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:bg-slate-100"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Ordre</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={image.displayOrder}
                          onChange={(event) => {
                            const nextDisplayOrder = Number(event.target.value)
                            updatePendingImage(image.temporaryId, {
                              displayOrder:
                                Number.isInteger(nextDisplayOrder) && nextDisplayOrder >= 0
                                  ? nextDisplayOrder
                                  : 0,
                            })
                          }}
                          disabled={image.status === 'uploading' || image.status === 'uploaded'}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:bg-slate-100"
                        />
                      </label>
                    </div>

                    {image.status === 'uploading' ? (
                      <div aria-live="polite">
                        {image.progress === null ? (
                          <p className="text-sm font-medium text-slate-700">Téléversement en cours...</p>
                        ) : (
                          <>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-teal-700"
                                style={{ width: `${image.progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{image.progress}%</p>
                          </>
                        )}
                      </div>
                    ) : null}

                    {image.errorMessage ? (
                      <p id={`error-${image.temporaryId}`} className="text-sm text-red-700">
                        {image.errorMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-start gap-2 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => markPendingPrimary(image.temporaryId)}
                      disabled={image.status === 'uploading' || image.status === 'uploaded' || !image.canRetry}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:border-slate-200 disabled:text-slate-400"
                    >
                      <Star className="h-4 w-4" />
                      {image.primary ? 'Principale' : 'Photo principale'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePendingImage(image.temporaryId)}
                      disabled={image.status === 'uploading'}
                      aria-label={`Retirer ${image.file.name}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    )
  },
)

export default ProductImageManager
