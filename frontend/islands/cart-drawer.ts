import { trapFocus, removeTrapFocus } from '@/lib/a11y'
import { onCartEvent, CartAddedDetail } from '@/lib/cart-events'
import { must } from '@/lib/dom'

interface CartAddResponseSections {
  sections?: Record<string, string | null>
}

export class CartDrawer extends window.HTMLElement {
  activeElement?: HTMLElement
  #cleanup?: () => void

  connectedCallback() {
    const controller = new AbortController()
    const { signal } = controller

    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close(),
      { signal }
    )
    // Delegated so it survives renderContents() replacing the drawer's
    // innerHTML (the overlay lives inside #CartDrawer).
    this.addEventListener(
      'click',
      (evt) => {
        if ((evt.target as Element).closest('#CartDrawer-Overlay')) this.close()
      },
      { signal }
    )
    this.setHeaderCartIconAccessibility(signal)

    const offAdded = onCartEvent('added', (detail) => {
      this.renderContents(detail)
      this.open()
    })

    // The whole drawer can be replaced by a section re-render; without
    // cleanup the detached instance stays subscribed to cart:added and the
    // surviving #cart-icon-bubble accumulates one more click handler per
    // replacement.
    this.#cleanup = () => {
      controller.abort()
      offAdded()
    }
  }

  disconnectedCallback() {
    this.#cleanup?.()
    this.#cleanup = undefined
  }

  setHeaderCartIconAccessibility(signal: AbortSignal) {
    // The icon lives in the header section — optional, not an invariant of
    // this island's own markup.
    const cartLink = document.getElementById('cart-icon-bubble')
    if (!cartLink) return

    cartLink.setAttribute('role', 'button')
    cartLink.setAttribute('aria-haspopup', 'dialog')
    cartLink.addEventListener(
      'click',
      (event) => {
        event.preventDefault()
        this.open(cartLink)
      },
      { signal }
    )
    cartLink.addEventListener(
      'keydown',
      (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault()
          this.open(cartLink)
        }
      },
      { signal }
    )
  }

  open(triggeredBy?: HTMLElement) {
    if (triggeredBy) this.setActiveElement(triggeredBy)
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('active')
    })

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = must(document, '#CartDrawer')
        const focusElement = must(this, '[tabindex="-1"]')
        trapFocus(containerToTrapFocusOn, focusElement)
      },
      { once: true }
    )

    document.body.classList.add('overflow-hidden')
  }

  close() {
    this.classList.remove('active')
    removeTrapFocus(this.activeElement)
    document.body.classList.remove('overflow-hidden')
  }

  /**
   * @param detail - cart:added event detail
   */
  renderContents(detail: CartAddedDetail) {
    const sections =
      detail.sections || (detail.response as CartAddResponseSections)?.sections
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = must(
        document,
        section.selector ?? `#${section.id}`
      )
      sectionElement.innerHTML = this.getSectionInnerHTML(
        sections![section.id] as string,
        section.selector
      )
    })
  }

  getSectionInnerHTML(html: string, selector: string = '.shopify-section') {
    return must(
      new window.DOMParser().parseFromString(html, 'text/html'),
      selector
    ).innerHTML
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer'
      },
      {
        id: 'cart-icon-bubble'
      }
    ]
  }

  setActiveElement(element: HTMLElement) {
    this.activeElement = element
  }
}

window.customElements.define('cart-drawer', CartDrawer)
