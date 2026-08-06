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

  constructor() {
    super()
    this.addEventListener('change', this.onVariantChange)
  }

  onVariantChange() {
    this.updateOptions()
    this.updateMasterId()
    this.toggleAddButton(true, '', false)
    this.removeErrorMessage()

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true)
      this.setUnavailable()
    } else {
      this.updateURL()
      this.updateVariantInput()
      this.renderProductInfo()
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll('select'),
      (select) => select.value
    )
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option
        })
        .includes(false)
    })
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
    const sectionId = this.dataset.originalSection || this.dataset.section
    const html = await this.fetchSectionHtml(sectionId as string)

    this.updatePriceFromHtml(html, sectionId as string)
    this.updateSellingPlanFromHtml(html, sectionId as string)
    this.updateAddButtonState()
  }

  async fetchSectionHtml(sectionId: string) {
    const url = `${this.dataset.url}?variant=${this.currentVariant!.id}&section_id=${sectionId}`
    const response = await fetch(url)
    const text = await response.text()
    return new window.DOMParser().parseFromString(text, 'text/html')
  }

  updatePriceFromHtml(html: Document, sectionId: string) {
    const source = html.getElementById(`price-${sectionId}`)
    const destination = document.getElementById(`price-${this.dataset.section}`)
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

  toggleAddButton(disable = true, text?: string, _unavailable?: boolean) {
    // _unavailable is accepted for call-site compatibility but was already
    // unused in the pre-conversion JS (dead parameter, preserved as-is).
    void _unavailable
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    if (!productForm) return
    const addButton = productForm.querySelector('[name="add"]')
    const addButtonText = productForm.querySelector<HTMLElement>(
      '[name="add"] > span'
    )
    if (!addButton) return

    if (disable) {
      addButton.setAttribute('disabled', 'disabled')
      if (text) addButtonText!.textContent = text
    } else {
      addButton.removeAttribute('disabled')
      addButtonText!.textContent = window.variantStrings.addToCart
    }
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    const addButton = button!.querySelector('[name="add"]')
    const addButtonText = button!.querySelector<HTMLElement>(
      '[name="add"] > span'
    )
    const price = document.getElementById(`price-${this.dataset.section}`)
    if (!addButton) return
    addButtonText!.textContent = window.variantStrings.unavailable
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
