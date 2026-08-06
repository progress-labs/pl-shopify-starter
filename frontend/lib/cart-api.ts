/**
 * Cart API
 *
 * Centralized cart operations that dispatch events for UI components to react to.
 *
 * Functions:
 *   - addToCart({ variantId, quantity, properties, sellingPlanId })
 *   - updateCartItem({ line, quantity, sections })
 *   - updateCartNote({ note })
 *
 * Events dispatched:
 *   - cart:adding/added       - Add to cart lifecycle
 *   - cart:updating/updated   - Update quantity lifecycle
 *   - cart:removing/removed   - Remove item lifecycle (quantity = 0)
 *   - cart:note-updated       - Cart note updated
 *   - cart:error              - Any API error
 */

import { CartAddDetail, dispatchCartEvent } from '@/lib/cart-events'
import { fetchConfig } from '@/lib/utils'

interface CartAddRequestBody {
  id: number
  quantity: number
  sections: string[]
  sections_url: string
  properties?: Record<string, string>
  selling_plan?: number
}

interface CartUpdateDetail {
  /** 1-based line item index */
  line: string | number
  /** New quantity (0 = remove) */
  quantity: number | string
  /** Section IDs to re-render */
  sections?: string[]
}

/**
 * Sections the add-to-cart response should re-render. With a drawer present,
 * ask it; without one the shopper is redirected to /cart after adding, so
 * only the icon bubble needs refreshing.
 */
function getSectionsToRender(): string[] {
  const cartDrawer = document.querySelector('cart-drawer')
  if (cartDrawer) {
    // The drawer island is a separate lazy chunk — the element can exist in
    // the DOM before its class has been upgraded. Fall back to the same ids
    // the upgraded class returns rather than calling a missing method.
    if (typeof cartDrawer.getSectionsToRender === 'function') {
      return cartDrawer.getSectionsToRender().map((section) => section.id)
    }
    return ['cart-drawer', 'cart-icon-bubble']
  }
  return ['cart-icon-bubble']
}

/**
 * One in-flight request per logical cart operation. Shopify's cart endpoints
 * are not safely concurrent, and without cancellation the *older* of two
 * overlapping responses can win the section render. Starting a new request
 * for the same key aborts the previous one.
 */
const inFlight = new Map<string, AbortController>()

function acquireSignal(key: string): AbortSignal {
  inFlight.get(key)?.abort()
  const controller = new AbortController()
  inFlight.set(key, controller)
  return controller.signal
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

export async function addToCart({
  variantId,
  quantity = 1,
  properties,
  sellingPlanId
}: CartAddDetail): Promise<void> {
  if (!variantId) {
    dispatchCartEvent('error', {
      error: 'No variant ID provided',
      action: 'add'
    })
    return
  }

  dispatchCartEvent('adding', {
    variantId,
    quantity
  })

  const body: CartAddRequestBody = {
    id: Number(variantId),
    quantity,
    sections: getSectionsToRender(),
    sections_url: window.location.pathname
  }

  if (properties) {
    body.properties = properties
  }

  if (sellingPlanId) {
    body.selling_plan = Number(sellingPlanId)
  }

  try {
    const response = await fetch(window.routes.cart_add_url, {
      ...fetchConfig(),
      body: JSON.stringify(body),
      signal: acquireSignal('add')
    })

    if (
      !response.ok &&
      !response.headers.get('content-type')?.includes('json')
    ) {
      dispatchCartEvent('error', {
        error: window.cartStrings.error,
        action: 'add'
      })
      return
    }

    const data = await response.json()

    if (data.status) {
      // Shopify returns status property on error
      dispatchCartEvent('error', {
        error: data.description,
        action: 'add'
      })
      return
    }

    dispatchCartEvent('added', {
      variantId: Number(variantId),
      quantity,
      response: data,
      sections: data.sections
    })
  } catch (e) {
    if (isAbortError(e)) return
    dispatchCartEvent('error', {
      error: e instanceof Error ? e : String(e),
      action: 'add'
    })
  }
}

/**
 * Update a line item's quantity in the cart
 * @returns Cart state on success, undefined on error
 */
export async function updateCartItem({
  line,
  quantity,
  sections = []
}: CartUpdateDetail): Promise<unknown> {
  if (!line) {
    dispatchCartEvent('error', {
      error: 'No line item index provided',
      action: 'update'
    })
    return
  }

  const isRemoving = parseInt(String(quantity), 10) === 0

  dispatchCartEvent('updating', { line, quantity })

  if (isRemoving) {
    dispatchCartEvent('removing', { line })
  }

  const body = {
    line,
    quantity: parseInt(String(quantity), 10),
    sections,
    sections_url: window.location.pathname
  }

  try {
    const response = await fetch(window.routes.cart_change_url, {
      ...fetchConfig(),
      body: JSON.stringify(body),
      signal: acquireSignal(`change:${line}`)
    })

    if (
      !response.ok &&
      !response.headers.get('content-type')?.includes('json')
    ) {
      dispatchCartEvent('error', {
        error: window.cartStrings.error,
        action: isRemoving ? 'remove' : 'update'
      })
      return
    }

    const data = await response.json()

    if (data.status) {
      dispatchCartEvent('error', {
        error: data.description,
        action: isRemoving ? 'remove' : 'update'
      })
      return
    }

    dispatchCartEvent('updated', {
      line,
      cart: data,
      sections: data.sections
    })

    if (isRemoving) {
      dispatchCartEvent('removed', {
        line,
        cart: data,
        sections: data.sections
      })
    }

    return data
  } catch (e) {
    if (isAbortError(e)) return
    dispatchCartEvent('error', {
      error: e instanceof Error ? e : String(e),
      action: isRemoving ? 'remove' : 'update'
    })
  }
}

/**
 * Update the cart note
 * @returns Cart state on success, undefined on error
 */
export async function updateCartNote({
  note
}: {
  note: string
}): Promise<unknown> {
  try {
    const response = await fetch(window.routes.cart_update_url, {
      ...fetchConfig(),
      body: JSON.stringify({ note }),
      signal: acquireSignal('note')
    })

    if (
      !response.ok &&
      !response.headers.get('content-type')?.includes('json')
    ) {
      dispatchCartEvent('error', {
        error: window.cartStrings.error,
        action: 'note-update'
      })
      return
    }

    const cart = await response.json()

    if (cart.status) {
      dispatchCartEvent('error', {
        error: cart.description,
        action: 'note-update'
      })
      return
    }

    dispatchCartEvent('note-updated', { note, cart })
    return cart
  } catch (e) {
    if (isAbortError(e)) return
    dispatchCartEvent('error', {
      error: e instanceof Error ? e : String(e),
      action: 'note-update'
    })
  }
}
