import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../lib/api'

export type CartItem = Product

type CartContextValue = {
  cartItems: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  cartCount: number
  totalRequiredCoins: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  function addToCart(product: Product) {
    setCartItems((prev) => {
      if (prev.some((p) => p.productId === product.productId)) return prev
      return [...prev, product]
    })
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((p) => p.productId !== productId))
  }

  function clearCart() {
    setCartItems([])
  }

  const cartCount = cartItems.length

  const totalRequiredCoins = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.requiredCoins || 0), 0)
  }, [cartItems])

  const value: CartContextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount,
    totalRequiredCoins,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}


