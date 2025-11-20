import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createOrder, getProduct, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import CoinDisplay from '../components/CoinDisplay'
import { markOrderQueued } from '../lib/queuedOrders'

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
        if (res.queuedForRetry) {
          markOrderQueued(orderId)
        }
        if (!productId) clearCart()
        navigate(`/order/${orderId}`, { state: { queuedForRetry: Boolean(res.queuedForRetry) } })
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
      <header className="mb-8 text-left">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-200">Your Order</h1>
      </header>

      {loadingProduct && (
        <div className="text-sm text-slate-200">Loading product…</div>
      )}

      {!loadingProduct && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loadingProduct && !error && hasItems && (
        <section className="overflow-hidden">
          {productId ? (
            <div className="p-6 border border-violet-500 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="w-[175px] h-[175px] border rounded-xl overflow-hidden border-zinc-600 flex-shrink-0">
                  {(() => {
                    const imageBaseUrl = (import.meta as any).env?.VITE_IMAGE_BUCKET_URL as string | undefined
                    const src = imageBaseUrl && imageBaseUrl.trim().length > 0
                      ? `${imageBaseUrl}${product?.productId}.jpg`
                      : 'https://placehold.co/800x800/EEE/31343C'
                    return (
                      <img
                        src={src}
                        alt={product?.name}
                        className="w-full h-full object-cover"
                      />
                    )
                  })()}
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-medium text-slate-200">{product?.name}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{product?.description}</p>
                  <CoinDisplay count={product?.requiredCoins || 0} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="mt-3">
                 <div className='border border-zinc-600 rounded-lg p-2 my-auto w-1/3 mx-auto text-left'>
                   <h2 className='text-2xl font-medium text-slate-200'>Coins Needed</h2>
                   <div className="flex items-center justify-between">
                     <span className="font-medium text-4xl text-white">{totalRequiredCoins}</span>
                     <CoinDisplay count={totalRequiredCoins} showText={false} />
                   </div>
                 </div>
              </div>
              <ul className="mt-3 space-y-2">
                {cartItems.map((p) => (
                  <li key={p.productId} className="flex items-start gap-4 text-md border border-violet-500 rounded-lg p-2">
                    <div className="w-[175px] h-[175px] border rounded-xl overflow-hidden border-zinc-600 bg-white dark:bg-neutral-950 flex-shrink-0">
                      {(() => {
                        const imageBaseUrl = (import.meta as any).env?.VITE_IMAGE_BUCKET_URL as string | undefined
                        const src = imageBaseUrl && imageBaseUrl.trim().length > 0
                          ? `${imageBaseUrl}${p.productId}.jpg`
                          : 'https://placehold.co/800x800/EEE/31343C'
                        return (
                          <img
                            src={src}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        )
                      })()}
                    </div>
                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-medium text-slate-200">{p.name}</h2>
                      <p className="text-sm text-zinc-400 mt-1">{p.description}</p>
                      <CoinDisplay count={p.requiredCoins || 0} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 gap-4 text-left">
            <h2 className='text-2xl font-medium text-slate-200'>Complete Your Order</h2>
            <div className="border border-zinc-600 rounded-lg p-2 bg-zinc-900 p-6">
              <div className='mb-4'>
                <label htmlFor="name" className="block text-md font-medium mb-1 text-white">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ada Lovelace"
                  required
                />
              </div>

              <div className='mb-4'>
                <label htmlFor="email" className="block text-md font-medium mb-1 text-white">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className='mb-4'>
                <label htmlFor="coinCount" className="block text-md font-medium mb-1 text-white">Coins to Spend</label>
                <input
                  id="coinCount"
                  type="number"
                  min={minRequired || 1}
                  value={coinCount}
                  onChange={(e) => setCoinCount(parseInt(e.target.value || '0', 10))}
                  className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Minimum required: {minRequired}</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 px-3 py-1.5 text-sm font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border disabled:opacity-50 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400"
                >
                  {submitting ? 'Placing Order…' : 'Place Order'}
                </button>
              </div>
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

