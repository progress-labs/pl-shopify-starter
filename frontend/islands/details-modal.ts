/**
 * @file `<details-modal>` — full-screen modal built on a `<details>` element.
 *
 * Extends the native disclosure pattern with focus trapping, Escape-to-close,
 * click-outside-to-close (including `.modal-overlay`), and body scroll lock.
 * Base class for {@link HeaderDrawer} and {@link PasswordModal}.
 */
import { removeTrapFocus, trapFocus } from '@/lib/a11y'
import { must } from '@/lib/dom'

export default class DetailsModal extends window.HTMLElement {
  detailsContainer: HTMLDetailsElement
  summaryToggle: HTMLElement
  onBodyClickEvent?: (event: MouseEvent) => void

  constructor() {
    super()
    this.detailsContainer = must<HTMLDetailsElement>(this, 'details')
    this.summaryToggle = must(this, 'summary')

    this.detailsContainer.addEventListener(
      'keyup',
      (event) => event.code.toUpperCase() === 'ESCAPE' && this.close()
    )
    this.summaryToggle.addEventListener('click', (event) =>
      this.onSummaryClick(event)
    )
    must(this, 'button[type="button"]').addEventListener('click', () =>
      this.close()
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
  onSummaryClick(event: MouseEvent) {
    event.preventDefault()
    const details = (event.target as HTMLElement).closest('details')!
    if (details.hasAttribute('open')) {
      this.close()
    } else {
      this.open(event)
    }
  }

  /**
   * Close when clicking outside the modal or on `.modal-overlay`.
   * @param {MouseEvent} event
   */
  onBodyClick(event: MouseEvent) {
    if (
      !this.contains(event.target as Node) ||
      (event.target as HTMLElement).classList.contains('modal-overlay')
    )
      this.close(false)
  }

  /**
   * Open the modal, trap focus, and lock body scroll.
   * @param event - Originating click event (used to find the `<details>`).
   *   Only `target` is read, so callers may pass a real click event or a
   *   synthetic `{ target }` (see {@link PasswordModal}'s auto-open).
   */
  open(event: Pick<MouseEvent, 'target'>) {
    const onBodyClickEvent =
      this.onBodyClickEvent || ((e: MouseEvent) => this.onBodyClick(e))
    this.onBodyClickEvent = onBodyClickEvent
    ;(event.target as HTMLElement)
      .closest('details')!
      .setAttribute('open', 'true')
    document.body.addEventListener('click', onBodyClickEvent)
    document.body.classList.add('overflow-hidden')

    trapFocus(
      must(this.detailsContainer, '[tabindex="-1"]'),
      must(this.detailsContainer, 'input:not([type="hidden"])')
    )
  }

  /**
   * Close the modal, release the focus trap, and restore body scroll.
   * @param {boolean} [focusToggle=true] - Whether to return focus to the summary toggle
   */
  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null)
    this.detailsContainer.removeAttribute('open')
    if (this.onBodyClickEvent) {
      document.body.removeEventListener('click', this.onBodyClickEvent)
    }
    document.body.classList.remove('overflow-hidden')
  }
}

window.customElements.define('details-modal', DetailsModal)
