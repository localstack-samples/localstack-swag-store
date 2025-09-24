import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

type CartModalProps = {
  open: boolean
  onClose: () => void
}

function CartModal({ open, onClose }: CartModalProps) {
  const { cartItems, removeFromCart, clearCart, totalRequiredCoins } = useCart()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-xl">
        <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Your Cart</h2>
          <button onClick={onClose} className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Close</button>
        </div>

        <div className="p-4 h-[calc(100%-7.5rem)] overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Your cart is empty.</div>
          ) : (
            <ul className="space-y-3">
              {cartItems.map((item) => (
                <li key={item.productId} className="flex items-center justify-between border rounded-lg border-neutral-200 dark:border-neutral-800 p-3">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">Requires {item.requiredCoins} {item.requiredCoins === 1 ? 'Coin' : 'Coins'}</div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-[3.5rem] flex items-center justify-between px-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-sm">
            <span className="text-neutral-600 dark:text-neutral-400 mr-1">Total:</span>
            <span className="font-medium">{totalRequiredCoins}</span>
            <span className="ml-1">{totalRequiredCoins === 1 ? 'Coin' : 'Coins'}</span>
          </div>

          {cartItems.length > 0 ? (
            <div className="flex items-center gap-2">
              <button onClick={clearCart} className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Clear</button>
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700"
                onClick={onClose}
              >
                Proceed to Checkout
              </Link>
            </div>
          ) : (
            <button disabled className="inline-flex items-center justify-center rounded-md bg-neutral-300 text-neutral-700 px-3 py-1.5 text-xs font-medium opacity-60 cursor-not-allowed">
              Proceed to Checkout
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

export default CartModal


