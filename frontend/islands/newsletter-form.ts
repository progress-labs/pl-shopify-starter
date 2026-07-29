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
import { must } from '@/lib/dom'

class NewsletterForm extends window.HTMLElement {
  form!: HTMLFormElement
  emailInput!: HTMLInputElement
  messageEl: HTMLElement | null
  listId: string | null

  constructor() {
    super()

    this.form = must<HTMLFormElement>(this, 'form')
    this.emailInput = must<HTMLInputElement>(this, 'input[name="email"]')
    this.messageEl = this.querySelector('[data-message]')
    this.listId = this.getAttribute('list-id') || window.__theme.klaviyo.listId

    if (!this.listId) {
      console.error('newsletter-form: missing required list-id attribute')
      return
    }

    this.form.addEventListener('submit', (e) => this.onSubmit(e))
  }

  onSubmit(e: SubmitEvent) {
    e.preventDefault()

    const email = this.emailInput.value
    this.setAttribute('loading', '')

    const messages = {
      success: 'Success!',
      error: 'Error!'
    }

    subscribe(this.listId as string, email).then((resp) => {
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

  showMessage(text: string) {
    if (this.messageEl) {
      this.messageEl.textContent = text
      this.messageEl.removeAttribute('hidden')
    }
  }
}

window.customElements.define('newsletter-form', NewsletterForm)
