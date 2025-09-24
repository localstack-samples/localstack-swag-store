import { useEffect, useState } from 'react'
import { getProducts, type Product } from '../lib/api'
import ProductGrid from '../components/ProductGrid'

function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getProducts()
      .then((items) => {
        if (!mounted) return
        setProducts(items)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.message || 'Failed to load products')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          LocalStack Swag Store
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Claim your swag with coins.</p>
      </header>

      {loading && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">Loading products…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && <ProductGrid products={products} />}
    </main>
  )
}

export default HomePage


