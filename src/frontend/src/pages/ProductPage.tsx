import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'

function ProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!productId) {
      setError('Missing product id')
      setLoading(false)
      return
    }
    getProduct(productId)
      .then((p) => {
        if (!mounted) return
        if (!p) {
          setError('Product not found')
        } else {
          setProduct(p)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Failed to load product')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [productId])

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Product</h1>
      </header>

      {loading && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && product && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border rounded-xl overflow-hidden border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="aspect-square bg-neutral-100 dark:bg-neutral-900">
              {(() => {
                const imageBaseUrl = (import.meta as any).env?.VITE_IMAGE_BUCKET_URL as string | undefined
                const src = imageBaseUrl && imageBaseUrl.trim().length > 0
                  ? `${imageBaseUrl}${product.productId}.jpg`
                  : 'https://placehold.co/800x800/EEE/31343C'
                return (
              <img
                  src={src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                )
              })()}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">{product.name}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{product.description}</p>

            <div className="mt-4 text-sm">
              <div className="text-neutral-900 dark:text-neutral-100">
                Requires <span className="font-semibold">{product.requiredCoins}</span> {product.requiredCoins === 1 ? 'Coin' : 'Coins'}
              </div>
              <div className="text-neutral-600 dark:text-neutral-400 mt-1">In stock: {product.stock}</div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link
                to={`/checkout/${product.productId}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Redeem / Checkout
              </Link>
              <AddToCartButton product={product} />
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default ProductPage

function AddToCartButton({ product }: { product: Product }) {
  const { addToCart } = useCart()
  return (
    <button
      onClick={() => {
        addToCart(product)
        toast.success('Added to cart', { description: product.name })
      }}
      className="inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
      type="button"
    >
      Add to Cart
    </button>
  )
}

