/**
 * Cart API
 *
 * Listens for cart:add events and handles adding items to the cart.
 * This enables any component to add items without direct coupling to cart components.
 *
 * Usage:
 *   dispatchCartEvent('add', { variantId: '12345', quantity: 1 })
 *
 * Optional properties:
 *   - properties: Object of line item properties
 *   - sellingPlanId: Selling plan ID for subscriptions
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

import { fetchConfig } from '@/lib/utils'
import { dispatchCartEvent, onCartEvent } from '@/lib/cart-events'

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
async function addToCart({ variantId, quantity = 1, properties, sellingPlanId }) {
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

// Listen for cart:add events
onCartEvent('add', addToCart)
