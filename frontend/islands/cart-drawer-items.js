/**
 * @file `<cart-drawer-items>` — cart line-item management for the drawer variant.
 *
 * Extends {@link CartItems} and overrides `getSectionsToRender()` to target
 * the drawer container (`#CartDrawer`) and icon bubble instead of the
 * full cart page sections.
 */
import CartItems from './cart-items'

class CartDrawerItems extends CartItems {
  /** @returns {{ id: string, section: string, selector: string }[]} */
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '[tabindex="-1"]'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      }
    ]
  }
}

window.customElements.define('cart-drawer-items', CartDrawerItems)
