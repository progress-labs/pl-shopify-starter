/**
 * @file `<quantity-input>` — stepper control for numeric quantity inputs.
 *
 * Expects an `<input type="number">` and two `<button>` elements named
 * `"plus"` and `"minus"`. Clicking a button calls `stepUp()` or `stepDown()`
 * on the input and dispatches a bubbling `change` event when the value changes.
 */
import { must } from '@/lib/dom'

class QuantityInput extends window.HTMLElement {
  input!: HTMLInputElement
  changeEvent!: Event

  constructor() {
    super()
    this.input = must<HTMLInputElement>(this, 'input')
    this.changeEvent = new Event('change', { bubbles: true })

    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    )
  }

  onButtonClick(event: Event) {
    event.preventDefault()
    const previousValue = this.input.value

    if ((event.target as HTMLButtonElement).name === 'plus') {
      this.input.stepUp()
    } else {
      this.input.stepDown()
    }
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent)
  }
}

window.customElements.define('quantity-input', QuantityInput)
