/**
 * @file `<localization-form>` — language/country selector dropdown.
 *
 * Manages an ARIA-compliant dropdown built from a `<button>` toggle and a
 * `<ul>` option list. Toggles `aria-expanded` and `hidden` on the list,
 * handles Escape-to-close, click-outside-to-close, and focus-out-to-close.
 *
 * Expected child elements:
 * - `input[name="language_code"]` or `input[name="country_code"]` — hidden input
 * - `button` — dropdown toggle
 * - `ul` — option list containing `<a data-value="...">` items
 * - `form` — submitted on option selection
 */
import { must } from '@/lib/dom'

class LocalizationForm extends window.HTMLElement {
  elements: {
    input: HTMLInputElement
    button: HTMLElement
    list: HTMLElement
  }

  constructor() {
    super()
    this.elements = {
      input: must<HTMLInputElement>(
        this,
        'input[name="language_code"], input[name="country_code"]'
      ),
      button: must(this, 'button'),
      list: must(this, 'ul')
    }
    this.elements.button.addEventListener('click', this.toggleList.bind(this))
    this.elements.button.addEventListener('focusout', (event) =>
      this.onButtonFocusOut(event)
    )
    this.elements.list.addEventListener('focusout', (event) =>
      this.onListFocusOut(event)
    )
    this.addEventListener('keyup', (event) =>
      this.onLocalizationFormKeyUp(event)
    )

    this.querySelectorAll('a').forEach((item) =>
      item.addEventListener('click', (event) =>
        this.onItemClick(event as MouseEvent)
      )
    )

    document.body.addEventListener('click', (event) => this.onBodyClick(event))
  }

  hideList() {
    this.elements.button.setAttribute('aria-expanded', 'false')
    this.elements.list.setAttribute('hidden', 'true')
    this.elements.button.classList.remove(
      'rounded-b',
      'md:rounded-b-none',
      'md:rounded-b-none'
    )
    this.elements.button.classList.add('rounded')
  }

  onLocalizationFormKeyUp(event: KeyboardEvent) {
    if (event.code.toUpperCase() !== 'ESCAPE') return

    this.hideList()
    this.elements.button.focus()
  }

  onItemClick(event: MouseEvent) {
    event.preventDefault()
    const form = this.querySelector('form')
    this.elements.input.value = (event.currentTarget as HTMLElement).dataset
      .value as string
    if (form) form.submit()
  }

  toggleList() {
    this.elements.list.toggleAttribute('hidden')
    this.elements.button.classList.toggle('rounded-b')
    this.elements.button.classList.toggle('md:rounded-t')
    this.elements.button.classList.toggle('md:rounded-b-none')
    this.elements.button.setAttribute(
      'aria-expanded',
      (
        this.elements.button.getAttribute('aria-expanded') === 'false'
      ).toString()
    )
  }

  onButtonFocusOut(event: FocusEvent) {
    const disclosureLostFocus =
      this.contains(event.relatedTarget as Node) === false

    if (disclosureLostFocus) {
      this.hideList()
    }
  }

  onListFocusOut(event: FocusEvent) {
    const childInFocus = (event.currentTarget as HTMLElement).contains(
      event.relatedTarget as Node
    )
    if (!childInFocus) {
      this.hideList()
    }
  }

  onBodyClick(event: MouseEvent) {
    const isOption = this.contains(event.target as Node)
    const isVisible =
      this.elements.button.getAttribute('aria-expanded') === 'true'

    if (isVisible && !isOption) {
      this.hideList()
    }
  }
}

window.customElements.define('localization-form', LocalizationForm)
