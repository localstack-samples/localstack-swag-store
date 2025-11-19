import axios, { AxiosError, type AxiosInstance } from 'axios'

// Types
export type Product = {
  productId: string
  name: string
  description: string
  requiredCoins: number
  stock: number
  version: number
}

export type OrderItem = {
  productId: string
  quantity: number
}

export type OrderStatus =
  | 'CREATED'
  | 'PENDING_VERIFICATION'
  | 'FULFILLED'
  | 'FAILED_INSUFFICIENT_COINS'
  | 'REJECTED'
  | 'QUEUED_FOR_RETRY'
  | string

export type Order = {
  orderId: string
  status: OrderStatus
  name?: string
  email?: string
  items?: OrderItem[]
  coinCount?: number
  createdAt?: string
  updatedAt?: string
}

export type CreateOrderPayload = {
  name: string
  email: string
  items: OrderItem[]
  coinCount: number
}

// Axios instance
const baseURL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined

const api: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 15000,
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = (error.response?.data as any)?.message || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

function ensureBaseUrl(): void {
  if (!baseURL || baseURL.trim().length === 0) {
    throw new Error('VITE_API_BASE_URL is not set. Create src/frontend/.env with VITE_API_BASE_URL=...')
  }
}

// API functions
export async function getProducts(): Promise<Product[]> {
  ensureBaseUrl()
  const { data } = await api.get('/products')
  if (Array.isArray(data)) return data as Product[]
  if (Array.isArray((data as any)?.products)) return (data as any).products as Product[]
  return []
}

export async function getProduct(productId: string): Promise<Product | undefined> {
  const products = await getProducts()
  return products.find((p) => p.productId === productId)
}

export type CreateOrderResponse = ({ orderId: string } & Partial<Order>) & {
  queuedForRetry?: boolean
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  ensureBaseUrl()
  const { data } = await api.post('/orders', JSON.stringify(payload), {
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  })
  // Some backends may return { orderId } or full order
  if ((data as any)?.orderId) return data as CreateOrderResponse
  if ((data as any)?.order?.orderId) return (data as any).order as CreateOrderResponse
  return data as any
}

export async function getOrder(orderId: string): Promise<Order> {
  ensureBaseUrl()
  const { data } = await api.get(`/orders/${orderId}`)
  if ((data as any)?.order) return (data as any).order as Order
  return data as Order
}

export async function getAdminOrders(status?: string): Promise<Order[]> {
  ensureBaseUrl()
  const path = status ? `/admin/orders?status=${encodeURIComponent(status)}` : '/admin/orders'
  const { data } = await api.get(path)
  if (Array.isArray((data as any)?.orders)) return (data as any).orders as Order[]
  if (Array.isArray(data)) return data as Order[]
  return []
}

export async function fulfillOrder(orderId: string): Promise<any> {
  ensureBaseUrl()
  const { data } = await api.post('/admin/orders/fulfill', JSON.stringify({ orderId }), {
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  })
  return data
}

export async function setInventory(productId: string, quantity: number): Promise<any> {
  ensureBaseUrl()
  const { data } = await api.post('/admin/inventory/adjust', JSON.stringify({ productId, quantity }), {
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  })
  return data
}

export async function rejectOrder(orderId: string, reason?: string): Promise<any> {
  ensureBaseUrl()
  const { data } = await api.post('/admin/orders/reject', JSON.stringify({ orderId, reason }), {
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  })
  return data
}

export async function getAdminStats(): Promise<{ ordersPlaced: number; statusCounts: Record<string, number>; inventory: Record<string, number> }> {
  ensureBaseUrl()
  const { data } = await api.get('/admin/stats')
  return data as any
}


