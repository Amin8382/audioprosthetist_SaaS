import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import type { Order } from '../types/order'
import { formatOrderMoney } from '../utils/orderFormat'

type OrderSnapshotSectionsProps = {
  order: Order
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || '-'}</dd>
    </div>
  )
}

export default function OrderSnapshotSections({ order }: OrderSnapshotSectionsProps) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Synthèse commerciale</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ces valeurs reflètent l’offre acceptée au moment de la création de la commande. Elles ne
          suivent pas les futures modifications du catalogue.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Sous-total" value={formatOrderMoney(order.subtotal, order.currency)} />
          <InfoItem label="Total" value={formatOrderMoney(order.total, order.currency)} />
          <InfoItem label="Devise" value={order.currency} />
          <InfoItem
            label="Délai livraison"
            value={
              order.deliveryDelayDays === undefined || order.deliveryDelayDays === null
                ? '-'
                : `${order.deliveryDelayDays} jour(s)`
            }
          />
          <InfoItem label="Validité offre" value={formatDateOnly(order.validUntil)} />
          <InfoItem label="Créée le" value={formatDateTime(order.createdAt)} />
          <InfoItem label="Confirmée le" value={formatDateTime(order.confirmedAt)} />
          <InfoItem label="Annulée le" value={formatDateTime(order.cancelledAt)} />
        </dl>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-950">Notes fournisseur</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {order.supplierNotes || 'Aucune note fournisseur.'}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Lignes de commande</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Prix unitaire</th>
                <th className="px-4 py-3">Total ligne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...order.lines]
                .sort((left, right) => left.displayOrder - right.displayOrder)
                .map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{line.productName}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{line.productReference || '-'}</td>
                    <td className="px-4 py-4 text-slate-700">{line.quantity}</td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatOrderMoney(line.unitPrice, order.currency)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-950">
                      {formatOrderMoney(line.lineTotal, order.currency)}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-4 text-right font-semibold text-slate-950" colSpan={4}>
                  Total
                </td>
                <td className="px-4 py-4 text-lg font-semibold text-slate-950">
                  {formatOrderMoney(order.total, order.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  )
}
