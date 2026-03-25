/**
 * @file `<newsletter-form>` — Klaviyo newsletter signup form.
 *
 * Expected DOM:
 *   <newsletter-form list-id="KLAVIYO_LIST_ID" client:visible>
 *     <form>
 *       <input type="email" name="email" required>
 *       <button type="submit">Subscribe</button>
 *       <span data-message hidden></span>
 *     </form>
 *   </newsletter-form>
 *
 * Attributes:
 *   - list-id {string} - Klaviyo list ID (required)
 *
 * States reflected via attributes on the element:
 *   - [loading] - Present while submission is in progress
 *   - [success] - Present after successful subscription
 */
import { subscribe } from 'klaviyo-subscribe'

class NewsletterForm extends window.HTMLElement {
  constructor() {
    super()

    this.form = this.querySelector('form')
    this.emailInput = this.querySelector('input[name="email"]')
    this.messageEl = this.querySelector('[data-message]')
    this.listId = this.getAttribute('list-id') || window.__theme.klaviyo.listId

    if (!this.listId) {
      console.error('newsletter-form: missing required list-id attribute')
      return
    }

    this.form.addEventListener('submit', this.onSubmit.bind(this))
  }

  onSubmit(e) {
    e.preventDefault()

    const email = this.emailInput.value
    this.setAttribute('loading', '')

    const messages = {
      success: 'Success!',
      error: 'Error!'
    }

    subscribe(this.listId, email).then((resp) => {
      this.emailInput.value = 'Submitting...'

      if (resp.success) {
        this.setAttribute('success', '')
        setTimeout(() => {
          this.form.reset()
          this.showMessage(messages.success)
        }, 600)
      } else {
        this.showMessage(messages.error)
        this.emailInput.value = ''
      }

      this.removeAttribute('loading')
    })
  }

  showMessage(text) {
    if (this.messageEl) {
      this.messageEl.textContent = text
      this.messageEl.removeAttribute('hidden')
    }
  }
}

window.customElements.define('newsletter-form', NewsletterForm)
