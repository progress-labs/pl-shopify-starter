/**
 * @file `<cart-remove-button>` — removes a line item from the cart.
 *
 * On click, finds the nearest `<cart-items>` or `<cart-drawer-items>` ancestor
 * and calls `updateQuantity(index, 0)` to remove the item.
 *
 * @attr data-index - 1-based line item index passed to `updateQuantity`
 */
class CartRemoveButton extends window.HTMLElement {
  constructor() {
    super()
    this.addEventListener('click', (event) => {
      event.preventDefault()
      const cartItems =
        this.closest('cart-items') || this.closest('cart-drawer-items')
      cartItems.updateQuantity(this.dataset.index, 0)
    })
  }
}

window.customElements.define('cart-remove-button', CartRemoveButton)
