/**
 * @file `<details-disclosure>` — lightweight disclosure with animation support.
 *
 * Wraps a native `<details>` element. Closes when focus leaves the component.
 * Caches CSS animations (via `Element.getAnimations()`) on first toggle and
 * replays/cancels them on subsequent open/close cycles.
 */
import { must } from '@/lib/dom'

export default class DetailsDisclosure extends window.HTMLElement {
  mainDetailsToggle: HTMLDetailsElement
  content: HTMLElement
  animations?: Animation[]

  constructor() {
    super()
    this.mainDetailsToggle = must<HTMLDetailsElement>(this, 'details')
    this.content = must(this.mainDetailsToggle, 'summary')
      .nextElementSibling as HTMLElement

    this.mainDetailsToggle.addEventListener(
      'focusout',
      this.onFocusOut.bind(this)
    )
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this))
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close()
    })
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations()

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play())
    } else {
      this.animations.forEach((animation) => animation.cancel())
    }
  }

  /** Close the disclosure and update `aria-expanded` on the summary. */
  close() {
    this.mainDetailsToggle.removeAttribute('open')
    must(this.mainDetailsToggle, 'summary').setAttribute(
      'aria-expanded',
      'false'
    )
  }
}

window.customElements.define('details-disclosure', DetailsDisclosure)
