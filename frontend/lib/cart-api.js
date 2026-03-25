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

/**
 * @typedef {Object} CartAddRequestBody
 * @property {number} id - Variant ID
 * @property {number} quantity
 * @property {string[]} sections - Section IDs to re-render
 * @property {string} sections_url - Current page pathname
 * @property {Object<string, string>} [properties] - Line item custom properties
 * @property {number} [selling_plan] - Selling plan ID
 */

import { dispatchCartEvent } from '@/lib/cart-events'
import { fetchConfig } from '@/lib/utils'

/**
 *
 * @question - Why do we only render the cart-icon-bubble section?
 */
function getSectionsToRender() {
  const cartDrawer = document.querySelector('cart-drawer')
  if (cartDrawer) {
    return cartDrawer.getSectionsToRender().map((section) => section.id)
  }
  return ['cart-icon-bubble']
}

/**
 * @param {import('./cart-events').CartAddDetail} detail
 * @returns {Promise<void>}
 */
export async function addToCart({
  variantId,
  quantity = 1,
  properties,
  sellingPlanId
}) {
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

  const body = {
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
      error: e.message,
      action: 'add'
    })
  }
}

/**
 * @typedef {Object} CartUpdateDetail
 * @property {string|number} line - 1-based line item index
 * @property {number} quantity - New quantity (0 = remove)
 * @property {string[]} sections - Section IDs to re-render
 */

/**
 * Update a line item's quantity in the cart
 * @param {CartUpdateDetail} detail
 * @returns {Promise<Object|undefined>} Cart state on success, undefined on error
 */
export async function updateCartItem({ line, quantity, sections = [] }) {
  if (!line) {
    dispatchCartEvent('error', {
      error: 'No line item index provided',
      action: 'update'
    })
    return
  }

  const isRemoving = parseInt(quantity) === 0

  dispatchCartEvent('updating', { line, quantity })

  if (isRemoving) {
    dispatchCartEvent('removing', { line })
  }

  const body = {
    line,
    quantity: parseInt(quantity),
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
      error: e.message,
      action: isRemoving ? 'remove' : 'update'
    })
  }
}

/**
 * Update the cart note
 * @param {{ note: string }} detail
 * @returns {Promise<Object|undefined>} Cart state on success, undefined on error
 */
export async function updateCartNote({ note }) {
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
      error: e.message,
      action: 'note-update'
    })
  }
}
