import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'

type ProductGridItemProps = {
  product: Product
}

function formatCoins(requiredCoins: number): string {
  const unit = requiredCoins === 1 ? 'Coin' : 'Coins'
  return `Requires ${requiredCoins} ${unit}`
}

function ProductGridItem({ product }: ProductGridItemProps) {
  return (
    <li>
      <Link to={`/product/${product.productId}`} className="block group">
        <div className="relative border rounded-xl overflow-hidden border-neutral-200 dark:border-neutral-800 transition-colors group-hover:border-blue-600 bg-white dark:bg-neutral-950">
          <div className="aspect-square bg-neutral-100 dark:bg-neutral-900">
            <img
              src="https://placehold.co/600x600/EEE/31343C"
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate mr-3">
              {product.name}
            </h3>
            <span className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
              {formatCoins(product.requiredCoins)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

export default ProductGridItem


