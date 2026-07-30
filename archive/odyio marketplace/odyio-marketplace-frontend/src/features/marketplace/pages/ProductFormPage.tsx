import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../../shared/api/httpClient'
import Breadcrumbs from '../../../shared/components/Breadcrumbs'
import ErrorState from '../../../shared/components/ErrorState'
import LoadingState from '../../../shared/components/LoadingState'
import { getCategories } from '../api/categoryApi'
import { createProduct, getProductById, updateProduct } from '../api/productApi'
import { getSuppliers } from '../api/supplierApi'
import ProductImageManager, {
  type ProductImageManagerHandle,
  type UploadImagesResult,
} from '../components/ProductImageManager'
import {
  productFormSchema,
  toProductPayload,
  type ProductFormValues,
} from '../schemas/productSchema'
import { useActiveSupplier } from '../supplier/hooks/useActiveSupplier'
import { earSideLabels } from '../types/product'
import { getSupplierDisplayName } from '../types/supplier'

const defaultValues: ProductFormValues = {
  supplierId: '',
  categoryId: '',
  name: '',
  brand: '',
  model: '',
  reference: '',
  description: '',
  technicalSpecs: '',
  earSide: 'NA',
  available: true,
}

function FormError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="mt-1 text-sm text-red-700">{message}</p>
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedSupplierId } = useActiveSupplier()
  const imageManagerRef = useRef<ProductImageManagerHandle | null>(null)
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadImagesResult | null>(null)
  const [isUploadingAfterSave, setIsUploadingAfterSave] = useState(false)

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const productQuery = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id as string),
    enabled: isEditMode,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      ...defaultValues,
      supplierId: selectedSupplierId,
    },
  })

  useEffect(() => {
    if (productQuery.data) {
      reset({
        supplierId: selectedSupplierId || productQuery.data.supplierId,
        categoryId: productQuery.data.categoryId,
        name: productQuery.data.name ?? '',
        brand: productQuery.data.brand ?? '',
        model: productQuery.data.model ?? '',
        reference: productQuery.data.reference ?? '',
        description: productQuery.data.description ?? '',
        technicalSpecs: productQuery.data.technicalSpecs ?? '',
        earSide: productQuery.data.earSide,
        available: productQuery.data.available,
      })
    }
  }, [productQuery.data, reset, selectedSupplierId])

  useEffect(() => {
    if (!isEditMode) {
      setValue('supplierId', selectedSupplierId, { shouldValidate: true })
    }
  }, [isEditMode, selectedSupplierId, setValue])

  const createMutation = useMutation({ mutationFn: createProduct })
  const updateMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      updateProduct(id as string, toProductPayload({ ...values, supplierId: selectedSupplierId })),
  })

  const invalidateProductQueries = async (productId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['products', productId] }),
    ])
  }

  const finishOrStayAfterUploads = async (
    productId: string,
    successMessage: string,
    failurePrefix: string,
  ) => {
    const manager = imageManagerRef.current

    if (!manager?.hasPendingImages()) {
      await invalidateProductQueries(productId)
      navigate('/supplier/products', { state: { successMessage } })
      return
    }

    setIsUploadingAfterSave(true)

    try {
      const result = await manager.uploadPendingImages(productId)
      await invalidateProductQueries(productId)
      setUploadResult(result)

      if (result.failed.length === 0) {
        navigate('/supplier/products', { state: { successMessage } })
        return
      }

      setCreatedProductId(productId)
      setUploadResult({
        ...result,
        failed: result.failed.map((failure) => ({
          ...failure,
          message: `${failurePrefix}: ${failure.message}`,
        })),
      })
    } finally {
      setIsUploadingAfterSave(false)
    }
  }

  const onSubmit = async (values: ProductFormValues) => {
    if (!selectedSupplierId) {
      return
    }

    setUploadResult(null)

    if (createdProductId && !isEditMode) {
      await finishOrStayAfterUploads(
        createdProductId,
        'Le produit a ete cree avec ses photos.',
        'Televersement echoue',
      )
      return
    }

    if (isEditMode) {
      const product = await updateMutation.mutateAsync({ ...values, supplierId: selectedSupplierId })
      await finishOrStayAfterUploads(
        product.id,
        'Le produit a ete mis a jour.',
        'Produit mis a jour, mais une photo a echoue',
      )
      return
    }

    const product = await createMutation.mutateAsync(
      toProductPayload({ ...values, supplierId: selectedSupplierId }),
    )
    setCreatedProductId(product.id)
    await finishOrStayAfterUploads(
      product.id,
      'Le produit a ete cree avec ses photos.',
      'Produit cree, mais une photo a echoue',
    )
  }

  const handleFinishCreatedProduct = async () => {
    if (!createdProductId) {
      return
    }

    await invalidateProductQueries(createdProductId)
    navigate('/supplier/products', {
      state: { successMessage: 'Le produit a ete cree. Certaines photos restent en echec.' },
    })
  }

  const isLoading =
    suppliersQuery.isLoading || categoriesQuery.isLoading || (isEditMode && productQuery.isLoading)
  const isSubmitting = createMutation.isPending || updateMutation.isPending || isUploadingAfterSave
  const apiError = createMutation.error ?? updateMutation.error

  if (isLoading) {
    return <LoadingState label="Chargement du formulaire..." />
  }

  if (suppliersQuery.isError || categoriesQuery.isError || productQuery.isError) {
    return <ErrorState message="Impossible de charger les donnees du formulaire." />
  }

  if (!selectedSupplierId) {
    return (
      <ErrorState
        title="Fournisseur requis"
        message="Selectionnez un fournisseur actif avant de gerer ses produits."
      />
    )
  }

  if (isEditMode && productQuery.data?.supplierId !== selectedSupplierId) {
    return (
      <ErrorState
        title="Produit hors fournisseur actif"
        message="Ce produit n'appartient pas au fournisseur actif selectionne."
      />
    )
  }

  const selectedSupplier = (suppliersQuery.data ?? []).find(
    (supplier) => supplier.id === selectedSupplierId,
  )
  const imageProductId = isEditMode ? id : createdProductId ?? undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Produits', to: '/supplier/products' },
          { label: isEditMode ? 'Modifier' : 'Ajouter' },
        ]}
      />

      <Link
        to="/supplier/products"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux produits
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Produit</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          {isEditMode ? 'Modifier un produit' : 'Ajouter un produit'}
        </h1>
        <p className="mt-2 text-slate-600">
          Renseignez les informations catalogue du produit. Les photos sont televersees comme
          fichiers apres la creation du produit.
        </p>
      </div>

      {apiError ? (
        <ErrorState title="Enregistrement impossible" message={getApiErrorMessage(apiError)} />
      ) : null}

      {uploadResult?.failed.length ? (
        <ErrorState
          title="Produit enregistre, photos incompletes"
          message={`${uploadResult.successful} photo(s) televersee(s). ${uploadResult.failed.length} photo(s) ont echoue: ${uploadResult.failed
            .map((failure) => `${failure.fileName} (${failure.message})`)
            .join(', ')}`}
        />
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" {...register('supplierId')} />
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-slate-700">Fournisseur actif</span>
            <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {selectedSupplier ? getSupplierDisplayName(selectedSupplier) : selectedSupplierId}
            </div>
            <FormError message={errors.supplierId?.message} />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Categorie</span>
            <select
              {...register('categoryId')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              <option value="">Selectionner une categorie</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FormError message={errors.categoryId?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nom</span>
            <input
              {...register('name')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.name?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Marque</span>
            <input
              {...register('brand')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.brand?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Modele</span>
            <input
              {...register('model')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.model?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reference</span>
            <input
              {...register('reference')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.reference?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Cote oreille</span>
            <select
              {...register('earSide')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              {Object.entries(earSideLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FormError message={errors.earSide?.message} />
          </label>

          <label className="flex items-center gap-3 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              {...register('available')}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span className="text-sm font-medium text-slate-700">Produit disponible</span>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              {...register('description')}
              rows={6}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.description?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Specifications techniques</span>
            <textarea
              {...register('technicalSpecs')}
              rows={6}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
            <FormError message={errors.technicalSpecs?.message} />
          </label>
        </div>

        <ProductImageManager
          ref={imageManagerRef}
          productId={imageProductId}
          productName={productQuery.data?.name ?? 'Produit'}
          existingImages={isEditMode ? productQuery.data?.images ?? [] : []}
          canMutate
          onImagesChanged={() => {
            if (isEditMode) {
              return productQuery.refetch().then(() => undefined)
            }

            return undefined
          }}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          {createdProductId && !isEditMode ? (
            <button
              type="button"
              onClick={() => void handleFinishCreatedProduct()}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Terminer sans reessayer les photos
            </button>
          ) : null}
          <Link
            to="/supplier/products"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" />
            {isSubmitting
              ? isUploadingAfterSave
                ? 'Televersement des photos...'
                : 'Enregistrement...'
              : createdProductId && !isEditMode
                ? 'Reessayer les photos'
                : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
