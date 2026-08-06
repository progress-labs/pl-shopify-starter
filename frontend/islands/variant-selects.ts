/**
 * Variant Selects Island
 *
 * Expected data attributes:
 *   - data-section {string}           - Section ID for targeting DOM elements
 *   - data-url {string}               - Product URL (e.g. /products/my-product)
 *   - data-original-section {string}  - Original section ID (for theme editor)
 *   - data-update-url {string}        - "false" to skip URL updates
 *
 * Expects a <script type="application/json"> child containing a trimmed
 * variants array emitted by blocks/variant-picker.liquid — only the fields
 * this island reads are serialized.
 */
import { must } from '@/lib/dom'
import { captureException } from '@/lib/error-tracking'

interface VariantData {
  id: number
  available: boolean
  options: string[]
}

/** Structural type for the sibling `<product-form>` custom element. */
interface ProductFormElement extends Element {
  handleErrorMessage(message?: string): void
}

export default class VariantSelects extends window.HTMLElement {
  options!: string[]
  currentVariant?: VariantData
  variantData?: VariantData[]
  #fetchController?: AbortController
  #sectionCache = new Map<number, Document>()

  constructor() {
    super()
    this.addEventListener('change', this.onVariantChange)
  }

  onVariantChange() {
    this.updateOptions()
    this.updateMasterId()
    this.toggleAddButton(true, '')
    this.removeErrorMessage()

    if (!this.currentVariant) {
      this.setUnavailable()
    } else {
      this.updateURL()
      this.updateVariantInput()
      void this.renderProductInfo()
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll('select'),
      (select) => select.value
    )
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) =>
      variant.options.every((option, index) => this.options[index] === option)
    )
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return
    window.history.replaceState(
      {},
      '',
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    )
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    )
    productForms.forEach((productForm) => {
      const input = must<HTMLInputElement>(productForm, 'input[name="id"]')
      input.value = String(this.currentVariant!.id)
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  removeErrorMessage() {
    const section = this.closest('section')
    if (!section) return

    const productForm =
      section.querySelector<ProductFormElement>('product-form')
    if (productForm) productForm.handleErrorMessage()
  }

  async renderProductInfo() {
    const sectionId = (this.dataset.originalSection ||
      this.dataset.section) as string
    const variantId = this.currentVariant!.id

    // Abort any in-flight render — rapid variant switching must not let an
    // older response land last and show the wrong price.
    this.#fetchController?.abort()
    this.#fetchController = new AbortController()

    try {
      const html =
        this.#sectionCache.get(variantId) ??
        (await this.fetchSectionHtml(
          sectionId,
          variantId,
          this.#fetchController.signal
        ))
      this.#sectionCache.set(variantId, html)

      // The selection may have moved on while this response was in flight.
      if (this.currentVariant?.id !== variantId) return

      this.updatePriceFromHtml(html, sectionId)
      this.updateSellingPlanFromHtml(html, sectionId)
      this.updateAddButtonState()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      captureException(e, { tags: { island: 'variant-selects' } })
    }
  }

  async fetchSectionHtml(
    sectionId: string,
    variantId: number,
    signal: AbortSignal
  ) {
    const url = `${this.dataset.url}?variant=${variantId}&section_id=${sectionId}`
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    return new window.DOMParser().parseFromString(text, 'text/html')
  }

  /**
   * The price element carries no unique id (the Price block is shared with
   * product cards, where a per-section id would duplicate across the grid),
   * so both lookups scope a [data-product-price] hook to the section's
   * #ProductInfo container.
   */
  priceElement(root: Document | typeof document, sectionId: string) {
    return root.querySelector<HTMLElement>(
      `#ProductInfo-${sectionId} [data-product-price]`
    )
  }

  updatePriceFromHtml(html: Document, sectionId: string) {
    const source = this.priceElement(html, sectionId)
    const destination = this.priceElement(
      document,
      this.dataset.section as string
    )
    if (source && destination) {
      destination.innerHTML = source.innerHTML
      destination.classList.remove('invisible')
    }
  }

  updateSellingPlanFromHtml(html: Document, sectionId: string) {
    const source = html.getElementById(`selling-plan-picker-${sectionId}`)
    const destination = document.getElementById(
      `selling-plan-picker-${this.dataset.section}`
    )
    if (source && destination) {
      destination.innerHTML = source.innerHTML
    }
  }

  updateAddButtonState() {
    this.toggleAddButton(
      !this.currentVariant!.available,
      window.variantStrings.soldOut
    )
  }

  toggleAddButton(disable = true, text?: string) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    if (!productForm) return
    const addButton = productForm.querySelector('[name="add"]')
    const addButtonText = productForm.querySelector<HTMLElement>(
      '[name="add"] > span'
    )
    if (!addButton || !addButtonText) return

    if (disable) {
      addButton.setAttribute('disabled', 'disabled')
      if (text) addButtonText.textContent = text
    } else {
      addButton.removeAttribute('disabled')
      addButtonText.textContent = window.variantStrings.addToCart
    }
  }

  setUnavailable() {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    const addButtonText = productForm?.querySelector<HTMLElement>(
      '[name="add"] > span'
    )
    const price = this.priceElement(document, this.dataset.section as string)
    if (addButtonText) {
      addButtonText.textContent = window.variantStrings.unavailable
    }
    if (price) price.classList.add('invisible')
  }

  getVariantData(): VariantData[] {
    this.variantData =
      this.variantData ||
      (JSON.parse(
        must<HTMLScriptElement>(this, '[type="application/json"]')
          .textContent as string
      ) as VariantData[])
    return this.variantData
  }
}

window.customElements.define('variant-selects', VariantSelects)
