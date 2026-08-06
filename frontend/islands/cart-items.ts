/**
 * @file `<cart-items>` — manages line-item quantity updates on the full cart page.
 *
 * Listens for `change` events (debounced) on quantity inputs and POSTs to
 * the Shopify Cart API. After a successful update the relevant page sections
 * are re-rendered from the response and ARIA live regions are refreshed.
 *
 * @fires cart:updating - Before the fetch request (`{ line, quantity }`)
 * @fires cart:updated  - After successful update (`{ cart, sections }`)
 * @fires cart:removing - When quantity is set to 0 (`{ line }`)
 * @fires cart:removed  - After successful removal (`{ line, cart, sections }`)
 * @fires cart:error    - On fetch failure (`{ error, action }`)
 */
import { debounce } from '@/lib/utils'
import { trapFocus } from '@/lib/a11y'
import { updateCartItem } from '@/lib/cart-api'
import { announce } from '@/lib/cart-live-region'
import { must } from '@/lib/dom'

interface CartState {
  item_count: number
  sections: Record<string, string>
}

interface PendingUpdate {
  line: string
  name?: string | null
}

/**
 * Look up an element by one of two possible ids. The full cart page and the
 * cart drawer render different markup for the same concept (e.g. line-item
 * status region), so exactly one of the two ids is always present.
 */
function mustEither<T extends HTMLElement = HTMLElement>(
  idA: string,
  idB: string
): T {
  const el = document.getElementById(idA) ?? document.getElementById(idB)
  if (!el) {
    throw new Error(`mustEither(): neither "#${idA}" nor "#${idB}" found`)
  }
  return el as T
}

export default class CartItems extends window.HTMLElement {
  lineItemStatusElement: HTMLElement
  currentItemCount: number
  debouncedOnChange: (event: Event) => void
  pendingUpdate: PendingUpdate | null = null

  constructor() {
    super()

    this.lineItemStatusElement = mustEither(
      'shopping-cart-line-item-status',
      'CartDrawer-LineItemStatus'
    )

    this.currentItemCount = Array.from(
      this.querySelectorAll<HTMLInputElement>('[name="updates[]"]')
    ).reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0)

    this.debouncedOnChange = debounce((event: Event) => {
      this.onChange(event)
    }, 300)

    this.addEventListener('change', this.debouncedOnChange)
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement
    this.updateQuantity(
      target.dataset.index as string,
      target.value,
      document.activeElement!.getAttribute('name')
    )
  }

  /**
   * Sections to re-render after a cart update. Subclasses override this to
   * target different DOM containers (e.g. the cart drawer).
   * @returns {{ id: string, section: string, selector: string }[]}
   */
  getSectionsToRender(): { id: string; section: string; selector: string }[] {
    return [
      {
        id: 'main-cart-items',
        section: must(document, '#main-cart-items').dataset.id as string,
        selector: '.js-contents'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-subtotal',
        section: 'cart-subtotal',
        selector: '.shopify-section'
      }
    ]
  }

  /**
   * Update a line item's quantity via the Cart API and re-render sections.
   * @param line - 1-based line item index
   * @param quantity - New quantity (0 = remove)
   * @param name - Input name used to restore focus after DOM swap
   */
  async updateQuantity(
    line: string,
    quantity: string | number,
    name?: string | null
  ) {
    this.enableLoading(line)
    this.pendingUpdate = { line, name }

    const sections = this.getSectionsToRender().map(
      (section) => section.section
    )
    const result = await updateCartItem({ line, quantity, sections })

    if (result) {
      this.onCartUpdated(result as CartState)
    } else {
      this.onCartError()
    }
  }

  /**
   * Handle successful cart update - re-render sections and manage focus
   * @param cart - Cart state from API response
   */
  onCartUpdated(cart: CartState) {
    const { line, name } = this.pendingUpdate || {}

    this.classList.toggle('is-empty', cart.item_count === 0)
    const cartDrawerWrapper = document.querySelector('cart-drawer')

    if (cartDrawerWrapper) {
      cartDrawerWrapper.classList.toggle('is-empty', cart.item_count === 0)
    }

    this.getSectionsToRender().forEach((section) => {
      const container = must(document, `#${section.id}`)
      const elementToReplace =
        container.querySelector<HTMLElement>(section.selector) || container
      elementToReplace.innerHTML = this.getSectionInnerHTML(
        cart.sections[section.section],
        section.selector
      )
    })

    this.updateLiveRegions(line, cart.item_count)

    const lineItem =
      document.getElementById(`CartItem-${line}`) ||
      document.getElementById(`CartDrawer-Item-${line}`)
    const focusTarget = lineItem?.querySelector<HTMLElement>(`[name="${name}"]`)

    if (lineItem && focusTarget) {
      if (cartDrawerWrapper) {
        trapFocus(cartDrawerWrapper, focusTarget)
      } else {
        focusTarget.focus()
      }
    } else if (cart.item_count === 0 && cartDrawerWrapper) {
      trapFocus(
        must(cartDrawerWrapper, '#CartDrawer'),
        must(cartDrawerWrapper, '[tabindex="-1"]')
      )
    } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
      trapFocus(
        cartDrawerWrapper,
        document.querySelector('.cart-item-name') as HTMLElement
      )
    }

    this.disableLoading()
    this.pendingUpdate = null
  }

  /**
   * Handle cart error - show error message and reset loading state
   */
  onCartError() {
    this.querySelectorAll('.loading-overlay').forEach((overlay) =>
      overlay.classList.add('hidden')
    )
    const errors = mustEither('cart-errors', 'CartDrawer-CartErrors')
    errors.textContent = window.cartStrings.error
    this.disableLoading()
    this.pendingUpdate = null
  }

  /**
   * Update ARIA live regions to announce quantity changes or errors.
   * If the item count hasn't changed (quantity limit hit), shows an error
   * message on the affected line item.
   * @param line - 1-based line item index
   * @param itemCount - Total item count from the updated cart
   */
  updateLiveRegions(line: string | undefined, itemCount: number) {
    if (this.currentItemCount === itemCount) {
      const lineItemError = mustEither(
        `Line-item-error-${line}`,
        `CartDrawer-LineItemError-${line}`
      )
      const quantityElement = mustEither<HTMLInputElement>(
        `Quantity-${line}`,
        `Drawer-quantity-${line}`
      )

      const message = window.cartStrings.quantityError.replace(
        '[quantity]',
        quantityElement.value
      )
      lineItemError.innerHTML = message

      // Override the generic cart:updated announcement scheduled by
      // initCartAnnouncements with the more specific quantity-limit message.
      // announce() cancels any pending announcement, so this wins.
      announce(stripHtml(message))
    }

    this.currentItemCount = itemCount
    this.lineItemStatusElement.setAttribute('aria-hidden', 'true')
  }

  getSectionInnerHTML(html: string, selector: string) {
    return must(
      new window.DOMParser().parseFromString(html, 'text/html'),
      selector
    ).innerHTML
  }

  enableLoading(line: string) {
    const mainCartItems = mustEither('main-cart-items', 'CartDrawer-CartItems')
    mainCartItems.classList.add('loading')

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    )
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    )

    ;[...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove('hidden')
    )

    ;(document.activeElement as HTMLElement).blur()
    this.lineItemStatusElement.setAttribute('aria-hidden', 'false')
  }

  disableLoading() {
    const mainCartItems = mustEither('main-cart-items', 'CartDrawer-CartItems')
    mainCartItems.classList.remove('loading')
  }
}

function stripHtml(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

window.customElements.define('cart-items', CartItems)
