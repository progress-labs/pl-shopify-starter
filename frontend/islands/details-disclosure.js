/**
 * @file `<details-disclosure>` — lightweight disclosure with animation support.
 *
 * Wraps a native `<details>` element. Closes when focus leaves the component.
 * Caches CSS animations (via `Element.getAnimations()`) on first toggle and
 * replays/cancels them on subsequent open/close cycles.
 */
export default class DetailsDisclosure extends window.HTMLElement {
  constructor() {
    super()
    this.mainDetailsToggle = this.querySelector('details')
    this.content =
      this.mainDetailsToggle.querySelector('summary').nextElementSibling

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
    this.mainDetailsToggle
      .querySelector('summary')
      .setAttribute('aria-expanded', false)
  }
}

window.customElements.define('details-disclosure', DetailsDisclosure)
