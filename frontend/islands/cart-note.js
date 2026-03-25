/**
 * @file `<cart-note>` — persists cart note changes to the Shopify Cart API.
 *
 * Listens for `change` events on its child textarea/input and delegates
 * to `updateCartNote()` in cart-api.js.
 *
 * @fires cart:note-updated - On success (`{ note, cart }`)
 * @fires cart:error        - On failure (`{ error, action: 'note-update' }`)
 */
import { updateCartNote } from '@/lib/cart-api'

class CartNote extends window.HTMLElement {
  constructor() {
    super()

    this.addEventListener('change', (event) => {
      event.stopPropagation()
      updateCartNote({ note: event.target.value })
    })
  }
}

window.customElements.define('cart-note', CartNote)
