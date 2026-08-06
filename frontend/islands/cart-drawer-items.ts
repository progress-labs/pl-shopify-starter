/**
 * @file `<cart-drawer-items>` — cart line-item management for the drawer variant.
 *
 * Extends {@link CartItems} and overrides `getSectionsToRender()` to target
 * the drawer container (`#CartDrawer`) and icon bubble instead of the
 * full cart page sections.
 */
import CartItems from './cart-items'

class CartDrawerItems extends CartItems {
  statusElementId(): string {
    return 'CartDrawer-LineItemStatus'
  }

  itemsContainerId(): string {
    return 'CartDrawer-CartItems'
  }

  errorsElementId(): string {
    return 'CartDrawer-CartErrors'
  }

  itemElementId(line: string | undefined): string {
    return `CartDrawer-Item-${line}`
  }

  lineItemErrorId(line: string | undefined): string {
    return `CartDrawer-LineItemError-${line}`
  }

  quantityInputId(line: string | undefined): string {
    return `Drawer-quantity-${line}`
  }

  getSectionsToRender(): { id: string; section: string; selector: string }[] {
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
