import { useEffect, useMemo, useState } from 'react'
import { fulfillOrder, getAdminOrders, getProducts, rejectOrder, getAdminStats, setInventory, type Order, type OrderStatus, type Product } from '../lib/api'

function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [fulfilling, setFulfilling] = useState<Set<string>>(new Set())
  const [rejecting, setRejecting] = useState<Set<string>>(new Set())
  const [fulfilledOrders, setFulfilledOrders] = useState<Order[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editStockValue, setEditStockValue] = useState<string>('')
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  function statusClasses(status?: OrderStatus): string {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'bg-blue-100 text-blue-800'
      case 'FULFILLED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'FAILED_INSUFFICIENT_COINS':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-80'
    }
  }

 function createBadge(status?: string) {
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(status)}`}>
        {status || 'CREATED'}
      </span>
    )
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [prods, ords, fulfilled, stats] = await Promise.all([
          getProducts(),
          getAdminOrders('PENDING_VERIFICATION'),
          getAdminOrders('FULFILLED'),
          getAdminStats().catch(() => null as any),
        ])
        if (!mounted) return
        setProducts(prods)
        setOrders(ords)
        setFulfilledOrders(fulfilled)
        if (stats?.statusCounts) setStatusCounts(stats.statusCounts)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || 'Failed to load admin data')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const productById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of products) map.set(p.productId, p)
    return map
  }, [products])

  const stats = useMemo(() => {
    const totalRemainingProducts = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    const pendingCount = orders.length
    const fulfilledCount = fulfilledOrders.length
    return { totalRemainingProducts, pendingCount, fulfilledCount }
  }, [products, orders, fulfilledOrders])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  async function onFulfill(orderId: string) {
    if (fulfilling.has(orderId)) return
    const next = new Set(fulfilling)
    next.add(orderId)
    setFulfilling(next)
    try {
      await fulfillOrder(orderId)
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId))
    } catch (err) {
      // No toast library mandated here; keep silent to stay minimal.
    } finally {
      setFulfilling((prev) => {
        const copy = new Set(prev)
        copy.delete(orderId)
        return copy
      })
    }
  }

  async function onReject(orderId: string) {
    if (rejecting.has(orderId) || fulfilling.has(orderId)) return
    const next = new Set(rejecting)
    next.add(orderId)
    setRejecting(next)
    try {
      await rejectOrder(orderId)
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId))
      // refresh counts
      getAdminStats().then((s) => s?.statusCounts && setStatusCounts(s.statusCounts)).catch(() => {})
    } catch (err) {
      // silent
    } finally {
      setRejecting((prev) => {
        const copy = new Set(prev)
        copy.delete(orderId)
        return copy
      })
    }
  }

  function onEditProduct(productId: string, currentStock: number) {
    setEditingProduct(productId)
    setEditStockValue(currentStock.toString())
  }

  function onCancelEdit() {
    setEditingProduct(null)
    setEditStockValue('')
  }

  async function onUpdateInventory(productId: string) {
    if (updating.has(productId)) return
    
    const newStock = parseInt(editStockValue, 10)
    if (isNaN(newStock) || newStock < 0) {
      // TODO: Add proper error handling/validation
      return
    }

    const next = new Set(updating)
    next.add(productId)
    setUpdating(next)
    
    try {
      // Call the actual API endpoint
      await setInventory(productId, newStock)
      
      // Update local state
      setProducts((prev) => 
        prev.map(p => 
          p.productId === productId 
            ? { ...p, stock: newStock }
            : p
        )
      )
      
      // Exit edit mode
      onCancelEdit()
    } catch (err) {
      console.error('Failed to update inventory:', err)
      // TODO: Add user-facing error notification
    } finally {
      setUpdating((prev) => {
        const copy = new Set(prev)
        copy.delete(productId)
        return copy
      })
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8 text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Overview
        </h1>
      </header>

      {!loading && !error && (
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="border rounded-xl border-zinc-600 p-4 text-left">
            <div className="text-lg tracking-wide text-slate-400">Products Remaining</div>
            <div className="mt-1 text-2xl font-semibold">{stats.totalRemainingProducts}</div>
          </div>
          <div className="border rounded-xl border-zinc-600 p-4 text-left">
            <div className="text-lg tracking-wide text-slate-400">Pending Orders</div>
            <div className="mt-1 text-2xl font-semibold">{stats.pendingCount}</div>
          </div>
          <div className="border rounded-xl border-zinc-600 p-4 text-left">
            <div className="text-lg tracking-wide text-slate-400">Fulfilled Orders</div>
            <div className="mt-1 text-2xl font-semibold">{stats.fulfilledCount}</div>
          </div>
          <div className="border rounded-xl border-zinc-600 p-4 text-left">
            <div className="text-lg tracking-wide text-slate-400">Rejected Orders</div>
            <div className="mt-1 text-2xl font-semibold">{statusCounts.REJECTED || 0}</div>
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className="mb-8 text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-4">Current Inventory</h2>
          <div className="text-left border border-zinc-600 rounded-xl">
            <table className="min-w-full text-sm border border-zinc-600 rounded-xl overflow-hidden">
              <thead className="text-left text-slate-200 bg-zinc-800 text-md font-medium">
                <tr>
                  <th className="px-4 py-3 text-left rounded-tl-xl">Product</th>
                  <th className="px-4 py-3 text-left">Required Coins</th>
                  <th className="px-4 py-3 text-left">Stock Remaining</th>
                  <th className="px-4 py-3 text-left rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p, index) => {
                  const isEditing = editingProduct === p.productId
                  const isUpdating = updating.has(p.productId)
                  const isLastRow = index === sortedProducts.length - 1
                  
                  return (
                    <tr key={p.productId} className="border-t border-zinc-600">
                      <td className={`px-4 py-3 text-white bg-zinc-900 ${isLastRow ? 'rounded-bl-xl' : ''}`}>{p.name}</td>
                      <td className="px-4 py-3 text-white bg-zinc-900">{p.requiredCoins}</td>
                      <td className="px-4 py-3 text-white bg-zinc-900">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editStockValue}
                            onChange={(e) => setEditStockValue(e.target.value)}
                            className="w-20 px-2 py-1 text-sm border rounded border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isUpdating}
                          />
                        ) : (
                          p.stock
                        )}
                      </td>
                      <td className={`px-4 py-3 text-white bg-zinc-900 ${isLastRow ? 'rounded-br-xl' : ''}`}>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onUpdateInventory(p.productId)}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 px-3 py-1.5 text-xs font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border disabled:opacity-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400 cursor-pointer"
                            >
                              {isUpdating ? 'Updating...' : 'Update'}
                            </button>
                            <button
                              onClick={onCancelEdit}
                              disabled={isUpdating}
                              className="inline-flex items-center justify-center rounded-md border border-zinc-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onEditProduct(p.productId, p.stock || 0)}
                            className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 px-3 py-1.5 text-xs font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border disabled:opacity-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400 cursor-pointer"
                          >
                            Edit Inventory
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          No orders are currently waiting for fulfillment.
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-4">
          {orders.map((order) => {
            const items = (order as any).items as Array<{ productId: string; quantity: number }> | undefined
            const firstProductId = items?.[0]?.productId
            const product = firstProductId ? productById.get(firstProductId) : undefined
            const productLabel = items && items.length > 1 && product
              ? `${product.name} +${items.length - 1} more`
              : product?.name || 'Unknown product'

            const attendeeName = (order as any).attendeeName || (order as any).name || 'Attendee'
            const claimedCoinCount = (order as any).claimedCoinCount ?? (order as any).coinCount ?? 0

            const isBusy = fulfilling.has(order.orderId)
            const isRejecting = rejecting.has(order.orderId)

            return (
              <li key={order.orderId} className="border rounded-xl border-zinc-600 p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-md tracking-wide text-slate-400">Order ID</div>
                    <div className="font-mono text-md text-white break-all">{order.orderId}</div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="text-slate-400 text-md">Status</div>
                        <div className="text-white text-md">{createBadge(order.status)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-md">Attendee</div>
                        <div className="text-white text-md">{attendeeName}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-md">Product</div>
                        <div className="text-white text-md truncate">{productLabel}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-md">Coins Claimed</div>
                        <div className="text-white text-md">{claimedCoinCount}</div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => onFulfill(order.orderId)}
                      disabled={isBusy || isRejecting}
                      className="inline-flex items-center justify-center rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                    >
                      {isBusy ? 'Fulfilling…' : 'Fulfill Order'}
                    </button>
                    <button
                      onClick={() => onReject(order.orderId)}
                      disabled={isBusy || isRejecting}
                      className="inline-flex items-center justify-center rounded-md bg-red-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                    >
                      {isRejecting ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default AdminPage

