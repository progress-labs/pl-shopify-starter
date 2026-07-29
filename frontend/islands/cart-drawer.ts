import { trapFocus, removeTrapFocus } from '@/lib/a11y'
import { onCartEvent, CartAddedDetail } from '@/lib/cart-events'
import { must } from '@/lib/dom'

interface CartAddResponseSections {
  sections?: Record<string, string | null>
}

export class CartDrawer extends window.HTMLElement {
  activeElement?: HTMLElement

  constructor() {
    super()

    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close()
    )
    must(this, '#CartDrawer-Overlay').addEventListener(
      'click',
      this.close.bind(this)
    )
    this.setHeaderCartIconAccessibility()

    onCartEvent('added', (detail) => {
      this.renderContents(detail)
      this.open()
    })
  }

  setHeaderCartIconAccessibility() {
    const cartLink = must(document, '#cart-icon-bubble')
    cartLink.setAttribute('role', 'button')
    cartLink.setAttribute('aria-haspopup', 'dialog')
    cartLink.addEventListener('click', (event) => {
      event.preventDefault()
      this.open(cartLink)
    })
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault()
        this.open(cartLink)
      }
    })
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

    setTimeout(() => {
      must(this, '#CartDrawer-Overlay').addEventListener(
        'click',
        this.close.bind(this)
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
