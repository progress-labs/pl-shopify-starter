/**
 * Product Form Island
 *
 * Expected DOM:
 *   <product-form client:idle>
 *     <form id="product-form-{sectionId}" data-type="add-to-cart-form">
 *       <input type="hidden" name="id" value="{variantId}" disabled>
 *       <input type="hidden" name="quantity" value="1">
 *       <input type="hidden" name="selling_plan" value="{sellingPlanId}">
 *       <input type="hidden" name="properties[key]" value="value">
 *       <button type="submit" name="add"><span>Add to cart</span></button>
 *       <div data-error-message hidden></div>
 *     </form>
 *   </product-form>
 *
 * Form fields:
 *   - id {string}                  - Variant ID (required, set by variant-selects/variant-radios)
 *   - quantity {number}            - Defaults to 1 if missing
 *   - selling_plan {string}        - Set by selling-plan-picker, empty for one-time purchase
 *   - properties[{key}] {string}   - Arbitrary line item properties
 *
 * Events consumed: cart:added, cart:error
 * Events dispatched: cart:add
 */
import { dispatchCartEvent, errorMessage, onCartEvent } from '@/lib/cart-events'
import { must } from '@/lib/dom'
import type { CartErrorDetail } from '@/lib/cart-events'

class ProductForm extends window.HTMLElement {
  form!: HTMLFormElement
  submitButton!: HTMLButtonElement
  pending = false
  errorMessage?: HTMLElement
  #cleanup?: () => void

  connectedCallback() {
    this.form = must(this, 'form')
    must<HTMLInputElement>(this.form, '[name="id"]').disabled = false
    this.submitButton = must(this, '[type="submit"]')

    if (document.querySelector('cart-drawer'))
      this.submitButton.setAttribute('aria-haspopup', 'dialog')

    const controller = new AbortController()
    this.form.addEventListener('submit', this.onSubmitHandler.bind(this), {
      signal: controller.signal
    })
    const unsubscribes = [
      onCartEvent('added', this.onCartAdded.bind(this)),
      onCartEvent('error', this.onCartError.bind(this))
    ]

    // Section re-renders replace this element; without cleanup every stale
    // instance stays subscribed to the document-level cart events.
    this.#cleanup = () => {
      controller.abort()
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }

  disconnectedCallback() {
    this.#cleanup?.()
    this.#cleanup = undefined
  }

  onSubmitHandler(evt: SubmitEvent) {
    evt.preventDefault()
    if (this.submitButton.getAttribute('aria-disabled') === 'true') return

    this.handleErrorMessage()
    this.submitButton.setAttribute('aria-disabled', 'true')
    this.submitButton.classList.add('loading')
    this.pending = true

    const formData = new window.FormData(this.form)
    const variantId = formData.get('id') as string
    const quantityValue = formData.get('quantity')
    const quantity =
      (quantityValue ? parseInt(String(quantityValue)) : NaN) || 1
    const properties = this.getLineItemProperties(formData)
    const sellingPlanId = formData.get('selling_plan') as string | null

    dispatchCartEvent('add', {
      variantId,
      quantity,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      sellingPlanId: sellingPlanId || undefined
    })
  }

  getLineItemProperties(formData: FormData) {
    const properties: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^properties\[(.+)\]$/)
      if (match && value) {
        properties[match[1]] = value as string
      }
    }
    return properties
  }

  onCartAdded() {
    if (!this.pending) return
    this.pending = false
    this.submitButton.classList.remove('loading')
    this.submitButton.removeAttribute('aria-disabled')

    const cartDrawer = document.querySelector('cart-drawer')
    if (cartDrawer && cartDrawer.classList.contains('is-empty')) {
      cartDrawer.classList.remove('is-empty')
    }

    if (!cartDrawer) {
      window.location.href = window.routes.cart_url
    }
  }

  onCartError({ error, action }: CartErrorDetail) {
    if (!this.pending || action !== 'add') return
    this.pending = false
    this.handleErrorMessage(errorMessage(error))
    this.submitButton.classList.remove('loading')
    // Re-enable the button — the error message is the feedback. Leaving
    // aria-disabled set would permanently block retries after one transient
    // failure (onSubmitHandler early-returns on it).
    this.submitButton.removeAttribute('aria-disabled')
  }

  handleErrorMessage(errorMessage: string | false = false) {
    this.errorMessage = this.errorMessage || must(this, '[data-error-message]')

    this.errorMessage.toggleAttribute('hidden', !errorMessage)

    if (errorMessage) {
      this.errorMessage.textContent = errorMessage
    }
  }
}

window.customElements.define('product-form', ProductForm)
