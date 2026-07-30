type SuccessMessageProps = {
  title?: string
  message: string
}

export default function SuccessMessage({ title = 'Action terminee', message }: SuccessMessageProps) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900" role="status">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  )
}
