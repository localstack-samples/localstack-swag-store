import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createOrder, getProduct, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'

function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { cartItems, totalRequiredCoins, clearCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [loadingProduct, setLoadingProduct] = useState<boolean>(!!productId)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [coinCount, setCoinCount] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    if (!productId) {
      setCoinCount(totalRequiredCoins)
      return () => {
        mounted = false
      }
    }
    getProduct(productId)
      .then((p) => {
        if (!mounted) return
        if (!p) {
          setError('Product not found')
        } else {
          setProduct(p)
          setCoinCount(p.requiredCoins)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Failed to load product')
      })
      .finally(() => {
        if (!mounted) return
        setLoadingProduct(false)
      })

    return () => {
      mounted = false
    }
  }, [productId, totalRequiredCoins])

  const hasItems = productId ? !!product : cartItems.length > 0
  const minRequired = productId ? (product?.requiredCoins || 0) : totalRequiredCoins
  const canSubmit = useMemo(() => {
    return hasItems && name.trim().length > 0 && /.+@.+\..+/.test(email) && coinCount >= minRequired
  }, [hasItems, name, email, coinCount, minRequired])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    try {
      setSubmitting(true)
      const items = productId
        ? [{ productId: product!.productId, quantity: 1 }]
        : cartItems.map((p) => ({ productId: p.productId, quantity: 1 }))
      const res = await createOrder({
        name: name.trim(),
        email: email.trim(),
        items,
        coinCount,
      })
      const orderId = (res as any)?.orderId
      if (orderId) {
        if (!productId) clearCart()
        navigate(`/order/${orderId}`)
      } else {
        throw new Error('Order ID missing in response')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Checkout</h1>
      </header>

      {loadingProduct && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading product…</div>
      )}

      {!loadingProduct && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loadingProduct && !error && hasItems && (
        <section className="border rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
          {productId ? (
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{product?.name}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{product?.description}</p>
              <p className="text-sm text-neutral-900 dark:text-neutral-100 mt-3">
                Requires <span className="font-semibold">{product?.requiredCoins}</span> {product?.requiredCoins === 1 ? 'Coin' : 'Coins'}
              </p>
            </div>
          ) : (
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Order Summary</h2>
              <ul className="mt-3 space-y-2">
                {cartItems.map((p) => (
                  <li key={p.productId} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-900 dark:text-neutral-100">{p.name}</span>
                    <span className="text-neutral-600 dark:text-neutral-400">{p.requiredCoins} {p.requiredCoins === 1 ? 'Coin' : 'Coins'}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-sm">
                <span className="text-neutral-600 dark:text-neutral-400 mr-1">Total:</span>
                <span className="font-medium">{totalRequiredCoins}</span>
                <span className="ml-1">{totalRequiredCoins === 1 ? 'Coin' : 'Coins'}</span>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Ada Lovelace"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="coinCount" className="block text-sm font-medium mb-1">Coins to Spend</label>
              <input
                id="coinCount"
                type="number"
                min={minRequired || 1}
                value={coinCount}
                onChange={(e) => setCoinCount(parseInt(e.target.value || '0', 10))}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Minimum required: {minRequired}</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                {submitting ? 'Placing Order…' : 'Place Order'}
              </button>
            </div>
          </form>
        </section>
      )}

      {!loadingProduct && !error && !hasItems && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Your cart is empty.{' '}
          <Link to="/" className="text-blue-600 hover:underline">Continue shopping</Link>.
        </div>
      )}
    </main>
  )
}

export default CheckoutPage

