import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProduct, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'
import CoinDisplay from '../components/CoinDisplay'

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

      {loading && (
        <div className="text-sm text-slate-200">Loading…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && product && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border rounded-xl overflow-hidden border-zinc-600">
            <div className="aspect-square bg-neutral-100">
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

          <div className="text-left">
            <h2 className="text-4xl font-medium text-slate-200">{product.name}</h2>
            <p className="text-lg text-zinc-400 mt-2">{product.description}</p>

            <div className="mt-4 text-lg">
              <CoinDisplay count={product.requiredCoins} />
              <div className="text-lg text-zinc-400 mt-1">In stock: {product.stock}</div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link
                to={`/checkout/${product.productId}`}
                className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 text-white px-4 py-2 text-sm font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border"
              >
                Redeem
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
      className="inline-flex items-center justify-center rounded-md border border-violet-500 px-4 py-2 text-sm font-medium hover:bg-violet-500 hover:text-white"
      type="button"
    >
      Add to Cart
    </button>
  )
}

