/**
 * Cart Events
 *
 * Global event system for cart interactions. Enables loose coupling
 * between cart components and allows external code to react to cart changes.
 *
 * Events:
 * - cart:adding    - Before add-to-cart API call
 * - cart:added     - After successful add
 * - cart:updating  - Before quantity/note change
 * - cart:updated   - After successful update
 * - cart:removing  - Before item removal
 * - cart:removed   - After item removed
 * - cart:error     - On any cart API error
 * - cart:note-updated - After cart note change
 */

export interface CartAddDetail {
  /** Shopify variant ID (coerced to number before API call) */
  variantId: number | string
  /** Quantity to add (defaults to 1) */
  quantity?: number
  /** Line item properties */
  properties?: Record<string, string>
  /** Selling plan ID for subscriptions (coerced to number) */
  sellingPlanId?: number | string
}

export interface CartAddedDetail {
  variantId: number
  quantity: number
  /** /cart/add.js response (line items, not the full cart object) */
  response: unknown
  /** Re-rendered section HTML keyed by section ID */
  sections: Record<string, string | null>
}

export interface CartErrorDetail {
  /** The original error — an Error for exceptions (stack preserved for
   *  Sentry), or a message string for API-reported failures */
  error: string | Error
  /** Which action failed */
  action: 'add' | 'update' | 'remove' | 'note-update'
}

/** Normalize a CartErrorDetail error for user-facing display. */
export function errorMessage(error: string | Error): string {
  return typeof error === 'string' ? error : error.message
}

export interface CartEventMap {
  add: CartAddDetail
  adding: { variantId: number | string; quantity: number }
  added: CartAddedDetail
  updating: { line: string | number; quantity: number | string }
  updated: {
    line: string | number
    cart: unknown
    sections: Record<string, string | null>
  }
  removing: { line: string | number }
  removed: {
    line: string | number
    cart: unknown
    sections: Record<string, string | null>
  }
  'note-updated': { note: string; cart: unknown }
  error: CartErrorDetail
}

/**
 * Dispatches a cart event on the document
 */
export function dispatchCartEvent<K extends keyof CartEventMap>(
  name: K,
  detail: CartEventMap[K]
): void {
  document.dispatchEvent(
    new CustomEvent(`cart:${name}`, { detail, bubbles: true })
  )
}

/**
 * Subscribe to a cart event
 * @returns Unsubscribe function
 */
export function onCartEvent<K extends keyof CartEventMap>(
  name: K,
  callback: (detail: CartEventMap[K]) => void
): () => void {
  const handler = (event: Event) =>
    callback((event as CustomEvent<CartEventMap[K]>).detail)
  document.addEventListener(`cart:${name}`, handler)
  return () => document.removeEventListener(`cart:${name}`, handler)
}
