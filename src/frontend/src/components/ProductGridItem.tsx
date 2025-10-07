import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'

type ProductGridItemProps = {
  product: Product
}

function formatCoins(requiredCoins: number): string {
  const unit = requiredCoins === 1 ? 'Coin' : 'Coins'
  return `Requires ${requiredCoins} ${unit}`
}

function ProductGridItem({ product }: ProductGridItemProps) {
  const { addToCart } = useCart()
  const imageBaseUrl = (import.meta as any).env?.VITE_IMAGE_BUCKET_URL as string | undefined
  const imageUrl = imageBaseUrl && imageBaseUrl.trim().length > 0
    ? `${imageBaseUrl}${product.productId}.jpg`
    : 'https://placehold.co/600x600/EEE/31343C'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
    toast.success('Added to cart', { description: product.name })
  }

  return (
    <li>
      <div className="relative border rounded-xl overflow-hidden border-neutral-200 dark:border-neutral-800 transition-colors hover:border-blue-600 bg-white dark:bg-neutral-950">
        <Link to={`/product/${product.productId}`} className="block">
          <div className="aspect-square bg-neutral-100 dark:bg-neutral-900">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate mr-3">
                {product.name}
              </h3>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                {formatCoins(product.requiredCoins)}
              </span>
            </div>
          </div>
        </Link>
        <div className="px-4 pb-4 flex gap-2">
          <Link
            to={`/checkout/${product.productId}`}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-3 py-2 text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Redeem
          </Link>
          <button
            onClick={handleAddToCart}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            type="button"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </li>
  )
}

export default ProductGridItem


