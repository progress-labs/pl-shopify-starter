/**
 * Variant Selects Island
 *
 * Expected data attributes:
 *   - data-section {string}           - Section ID for targeting DOM elements
 *   - data-url {string}               - Product URL (e.g. /products/my-product)
 *   - data-original-section {string}  - Original section ID (for theme editor)
 *   - data-update-url {string}        - "false" to skip URL updates
 *
 * Expects a <script type="application/json"> child containing the product
 * variants array serialized via {{ product.variants | json }}.
 *
 * @typedef {Object} VariantData
 * @property {number} id - Variant ID
 * @property {string} title - e.g. "Red / Small"
 * @property {number} price - Price in cents
 * @property {number|null} compare_at_price - Original price in cents
 * @property {boolean} available - In stock
 * @property {string[]} options - Option values matching product.options order
 * @property {string} sku
 * @property {string} barcode
 * @property {{url: string, aspect_ratio: number, alt: string, width: number, height: number}|null} featured_image
 * @property {boolean} requires_selling_plan - Whether a selling plan is mandatory
 * @property {Object[]} selling_plan_allocations - Available selling plan options for this variant
 * @property {Object|null} selected_selling_plan_allocation - Currently selected selling plan
 */
export default class VariantSelects extends window.HTMLElement {
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
      const input = productForm.querySelector('input[name="id"]')
      input.value = this.currentVariant.id
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  removeErrorMessage() {
    const section = this.closest('section')
    if (!section) return

    const productForm = section.querySelector('product-form')
    if (productForm) productForm.handleErrorMessage()
  }

  async renderProductInfo() {
    const sectionId = this.dataset.originalSection || this.dataset.section
    const html = await this.fetchSectionHtml(sectionId)

    this.updatePriceFromHtml(html, sectionId)
    this.updateSellingPlanFromHtml(html, sectionId)
    this.updateAddButtonState()
  }

  async fetchSectionHtml(sectionId) {
    const url = `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${sectionId}`
    const response = await fetch(url)
    const text = await response.text()
    return new window.DOMParser().parseFromString(text, 'text/html')
  }

  updatePriceFromHtml(html, sectionId) {
    const source = html.getElementById(`price-${sectionId}`)
    const destination = document.getElementById(`price-${this.dataset.section}`)
    if (source && destination) {
      destination.innerHTML = source.innerHTML
      destination.classList.remove('invisible')
    }
  }

  updateSellingPlanFromHtml(html, sectionId) {
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
      !this.currentVariant.available,
      window.variantStrings.soldOut
    )
  }

  toggleAddButton(disable = true, text) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    if (!productForm) return
    const addButton = productForm.querySelector('[name="add"]')
    const addButtonText = productForm.querySelector('[name="add"] > span')
    if (!addButton) return

    if (disable) {
      addButton.setAttribute('disabled', 'disabled')
      if (text) addButtonText.textContent = text
    } else {
      addButton.removeAttribute('disabled')
      addButtonText.textContent = window.variantStrings.addToCart
    }
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    )
    const addButton = button.querySelector('[name="add"]')
    const addButtonText = button.querySelector('[name="add"] > span')
    const price = document.getElementById(`price-${this.dataset.section}`)
    if (!addButton) return
    addButtonText.textContent = window.variantStrings.unavailable
    if (price) price.classList.add('invisible')
  }

  /** @returns {VariantData[]} */
  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent)
    return this.variantData
  }
}

window.customElements.define('variant-selects', VariantSelects)
