import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import CoinDisplay from '../components/CoinDisplay'

type CartModalProps = {
  open: boolean
  onClose: () => void
}

function CartModal({ open, onClose }: CartModalProps) {
  const { cartItems, removeFromCart, clearCart, totalRequiredCoins } = useCart()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-zinc-900 border border-zinc-700">
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-700">
          <h2 className="text-lg font-medium text-slate-200">Your Cart</h2>
          <button onClick={onClose} className="text-sm text-violet-500 hover:text-violet-700 cursor-pointer">Close</button>
        </div>

        <div className="p-4 h-[calc(100%-7.5rem)] overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="text-sm text-slate-200">Your cart is empty.</div>
          ) : (
            <ul className="space-y-3">
              {cartItems.map((item) => (
                <li key={item.productId} className="flex items-center justify-between border rounded-lg border-violet-500 p-3">
                  <div>
                    <div className="text-md font-medium text-slate-200">{item.name}</div>
                    <CoinDisplay count={item.requiredCoins} />
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-xs text-violet-500 hover:text-violet-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-[3.5rem] flex items-center justify-between px-4 border-t border-zinc-700">
          <div className="text-md">
            <span className="text-slate-200 mr-1">Total:</span>
            <span className="font-medium">{totalRequiredCoins}</span>
            <span className="ml-1 font-medium">{totalRequiredCoins === 1 ? 'Coin' : 'Coins'}</span>
          </div>

          {cartItems.length > 0 ? (
            <div className="flex items-center gap-2">
              <button onClick={clearCart} className="text-sm text-violet-500 hover:text-violet-700 cursor-pointer">Clear</button>
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 px-3 py-1.5 text-sm font-medium hover:bg-transparent hover:text-violet-500 hover:border-violet-500 hover:border"
                onClick={onClose}
              >
                Proceed to Checkout
              </Link>
            </div>
          ) : (
            <button disabled className="inline-flex items-center justify-center rounded-md bg-violet-500 border border-violet-500 text-white px-3 py-1.5 text-sm font-medium opacity-60 cursor-not-allowed">
              Proceed to Checkout
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

export default CartModal


