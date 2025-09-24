import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder, type Order, type OrderStatus } from '../lib/api'

function statusClasses(status?: OrderStatus): string {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    case 'FULFILLED':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    case 'FAILED_INSUFFICIENT_COINS':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
  }
}

function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: number | undefined

    async function poll() {
      if (!orderId) return
      try {
        const next = await getOrder(orderId)
        if (!mounted) return
        setOrder(next)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Failed to load order')
      }
    }

    poll()
    intervalId = window.setInterval(poll, 3000)

    return () => {
      mounted = false
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [orderId])

  const badge = useMemo(() => {
    const s = order?.status
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(s)}`}>
        {s || 'CREATED'}
      </span>
    )
  }, [order?.status])

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Order Placed!</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">Please show this ID to a LocalStack team member.</p>
      </header>

      {error && <div className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</div>}

      <section className="border rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
        <div className="p-6">
          <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1">Order ID</div>
          <div className="text-xl font-mono break-all">{orderId}</div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-1">Current Status</div>
            {badge}
          </div>
        </div>
      </section>
    </main>
  )
}

export default ConfirmationPage

