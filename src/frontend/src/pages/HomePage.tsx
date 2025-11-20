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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <img src="/images/banner.png" alt="LocalStack Swag Store" className="w-full h-auto rounded-[20px]" />
        <h1 className="text-4xl font-semibold tracking-tight text-white mt-4 mb-4">Claim your swag with coins.</h1>
      </header>

      {loading && (
        <div className="text-sm text-slate-200">Loading products…</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && <ProductGrid products={products} />}
    </main>
  )
}

export default HomePage


