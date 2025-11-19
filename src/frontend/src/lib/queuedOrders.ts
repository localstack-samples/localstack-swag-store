const PREFIX = 'swag-store:queued-order:'

function getStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function markOrderQueued(orderId: string): void {
  const store = getStore()
  if (!store) return
  try {
    store.setItem(`${PREFIX}${orderId}`, 'true')
  } catch {
    // ignore quota/security errors
  }
}

export function clearOrderQueued(orderId: string): void {
  const store = getStore()
  if (!store) return
  try {
    store.removeItem(`${PREFIX}${orderId}`)
  } catch {
    // ignore
  }
}

export function isOrderQueued(orderId: string): boolean {
  const store = getStore()
  if (!store) return false
  try {
    return store.getItem(`${PREFIX}${orderId}`) === 'true'
  } catch {
    return false
  }
}

