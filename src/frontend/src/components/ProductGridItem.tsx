import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import { toast } from 'sonner'
import CoinDisplay from './CoinDisplay'

type ProductGridItemProps = {
  product: Product
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
      <div className="relative border rounded-xl overflow-hidden border-zinc-800 transition-colors hover:border-blue-600 text-white">
        <Link to={`/product/${product.productId}`} className="block">
          <div className="aspect-square bg-neutral-100">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-4">
            <div className="mb-3 text-left">
              <h3 className="text-lg font-medium text-slate-200 mb-1">
                {product.name}
              </h3>
              <CoinDisplay count={product.requiredCoins} />
            </div>
          </div>
        </Link>
        <div className="px-4 pb-4 flex gap-2">
          <Link
            to={`/checkout/${product.productId}`}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 text-white px-3 py-2 text-xs font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border transition-colors"
          >
            Redeem
          </Link>
          <button
            onClick={handleAddToCart}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-violet-500 px-3 py-2 text-xs font-medium hover:bg-violet-500 hover:text-white transition-colors"
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


