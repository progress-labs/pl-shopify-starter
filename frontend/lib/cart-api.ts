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
 *
 * @question - Why do we only render the cart-icon-bubble section?
 */
function getSectionsToRender(): string[] {
  const cartDrawer = document.querySelector('cart-drawer')
  if (cartDrawer) {
    return cartDrawer.getSectionsToRender().map((section) => section.id)
  }
  return ['cart-icon-bubble']
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
      body: JSON.stringify(body)
    })

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
    dispatchCartEvent('error', {
      error: e instanceof Error ? e.message : String(e),
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

  dispatchCartEvent('updating', { line, quantity: Number(quantity) })

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
      body: JSON.stringify(body)
    })

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
    dispatchCartEvent('error', {
      error: e instanceof Error ? e.message : String(e),
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
      body: JSON.stringify({ note })
    })

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
    dispatchCartEvent('error', {
      error: e instanceof Error ? e.message : String(e),
      action: 'note-update'
    })
  }
}
