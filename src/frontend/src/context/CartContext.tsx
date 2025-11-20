import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
const STORAGE_KEY = 'localstack-swag-cart'

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch (err) {
      console.warn('Failed to read cart from storage', err)
      return []
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems))
    } catch (err) {
      console.warn('Failed to persist cart to storage', err)
    }
  }, [cartItems])

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


