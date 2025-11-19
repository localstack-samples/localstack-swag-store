import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { getOrder, type Order, type OrderStatus } from '../lib/api'
import { clearOrderQueued, isOrderQueued } from '../lib/queuedOrders'

function statusClasses(status?: OrderStatus): string {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    case 'FULFILLED':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    case 'FAILED_INSUFFICIENT_COINS':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    case 'QUEUED_FOR_RETRY':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
  }
}

function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queuedNotice, setQueuedNotice] = useState<boolean>(() => {
    if (!orderId) return false
    const fromState = Boolean((location.state as any)?.queuedForRetry)
    return fromState || isOrderQueued(orderId)
  })
  const [outageDetected, setOutageDetected] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    let intervalId: number | undefined

    async function poll() {
      if (!orderId) return
      try {
        const next = await getOrder(orderId)
        if (!mounted) return
        setOrder(next)
        setError(null)
        setQueuedNotice(false)
        setOutageDetected(false)
        clearOrderQueued(orderId)
      } catch (err: any) {
        if (!mounted) return
        const message = err?.message || 'Failed to load order'
        const looksLikeOutage = /500|internal server error/i.test(message)
        const orderIsQueued = queuedNotice || (orderId ? isOrderQueued(orderId) : false)
        if (orderIsQueued || looksLikeOutage) {
          setQueuedNotice(orderIsQueued)
          setOutageDetected(true)
          setError('We could not reach our order database yet. Your order is safe and this page refreshes automatically.')
        } else {
          setError(message)
        }
      }
    }

    poll()
    intervalId = window.setInterval(poll, 3000)

    return () => {
      mounted = false
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [orderId, queuedNotice])

  const derivedStatus = (queuedNotice && 'QUEUED_FOR_RETRY') || order?.status

  const badge = useMemo(() => {
    const s = derivedStatus
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(s)}`}>
        {s || 'CREATED'}
      </span>
    )
  }, [derivedStatus])

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Order Placed!</h1>
        <p className="text-sm text-slate-200 mt-2">Please show this ID to a LocalStack team member.</p>
      </header>

      {(queuedNotice || outageDetected) && (
        <div className="mb-6 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-300 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">We&apos;re buffering your order while DynamoDB recovers.</p>
          <p className="mt-1 text-xs sm:text-sm">
            A DynamoDB outage is causing delays in order processing. Your order ID is safe and this page will update automatically once the database is healthy again.
          </p>
        </div>
      )}

      {error && !(queuedNotice || outageDetected) && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</div>
      )}

      <section className="border rounded-xl border-zinc-600 overflow-hidden">
        <div className="p-6">
          <div className="text-sm uppercase tracking-wide text-slate-200 mb-1">Order ID</div>
          <div className="text-lg font-mono break-all">{orderId}</div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-slate-200 mb-1">Current Status</div>
            {badge}
          </div>
        </div>
      </section>
    </main>
  )
}

export default ConfirmationPage

