/**
 * @file `<details-modal>` — full-screen modal built on a `<details>` element.
 *
 * Extends the native disclosure pattern with focus trapping, Escape-to-close,
 * click-outside-to-close (including `.modal-overlay`), and body scroll lock.
 * Base class for {@link HeaderDrawer} and {@link PasswordModal}.
 */
import { removeTrapFocus, trapFocus } from '@/lib/a11y'

export default class DetailsModal extends window.HTMLElement {
  constructor() {
    super()
    this.detailsContainer = this.querySelector('details')
    this.summaryToggle = this.querySelector('summary')

    this.detailsContainer.addEventListener(
      'keyup',
      (event) => event.code.toUpperCase() === 'ESCAPE' && this.close()
    )
    this.summaryToggle.addEventListener('click', this.onSummaryClick.bind(this))
    this.querySelector('button[type="button"]').addEventListener(
      'click',
      this.close.bind(this)
    )

    this.summaryToggle.setAttribute('role', 'button')
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open')
  }

  /**
   * Toggle the modal on summary click. Prevents the native `<details>` toggle
   * so open/close can be managed with focus trapping.
   * @param {MouseEvent} event
   */
  onSummaryClick(event) {
    event.preventDefault()
    event.target.closest('details').hasAttribute('open')
      ? this.close()
      : this.open(event)
  }

  /**
   * Close when clicking outside the modal or on `.modal-overlay`.
   * @param {MouseEvent} event
   */
  onBodyClick(event) {
    if (
      !this.contains(event.target) ||
      event.target.classList.contains('modal-overlay')
    )
      this.close(false)
  }

  /**
   * Open the modal, trap focus, and lock body scroll.
   * @param {MouseEvent} event - Originating click event (used to find the `<details>`)
   */
  open(event) {
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this)
    event.target.closest('details').setAttribute('open', true)
    document.body.addEventListener('click', this.onBodyClickEvent)
    document.body.classList.add('overflow-hidden')

    trapFocus(
      this.detailsContainer.querySelector('[tabindex="-1"]'),
      this.detailsContainer.querySelector('input:not([type="hidden"])')
    )
  }

  /**
   * Close the modal, release the focus trap, and restore body scroll.
   * @param {boolean} [focusToggle=true] - Whether to return focus to the summary toggle
   */
  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null)
    this.detailsContainer.removeAttribute('open')
    document.body.removeEventListener('click', this.onBodyClickEvent)
    document.body.classList.remove('overflow-hidden')
  }
}

window.customElements.define('details-modal', DetailsModal)
