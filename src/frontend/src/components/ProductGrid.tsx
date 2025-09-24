import type { Product } from '../lib/api'
import ProductGridItem from './ProductGridItem'

type ProductGridProps = {
  products: Product[]
}

function ProductGrid({ products }: ProductGridProps) {
  if (!products?.length) {
    return (
      <div className="text-sm text-neutral-600 dark:text-neutral-400">No products available.</div>
    )
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {products.map((product) => (
        <ProductGridItem key={product.productId} product={product} />
      ))}
    </ul>
  )
}

export default ProductGrid


