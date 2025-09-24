import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useCart } from '../context/CartContext'
import CartModal from './CartModal'

function Navbar() {
  const { cartCount } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium tracking-tight">
            LocalStack Swag Store
          </Link>
          <button
            aria-label="Open cart"
            onClick={() => setOpen(true)}
            className="relative inline-flex items-center justify-center rounded-md px-3 py-2 hover:bg-white/10 transition-colors"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] h-4 min-w-4 px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <CartModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default Navbar


