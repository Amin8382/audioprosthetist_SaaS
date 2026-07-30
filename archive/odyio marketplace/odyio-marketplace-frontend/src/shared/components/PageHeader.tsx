import type { ReactNode } from 'react'
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
