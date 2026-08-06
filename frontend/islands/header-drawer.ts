/**
 * @file `<header-drawer>` — slide-out mobile navigation drawer.
 *
 * Extends {@link DetailsModal} with a CSS class-driven open animation
 * (`menu-opening`) and a 400ms `requestAnimationFrame` close delay to
 * allow the closing transition to complete before removing the `open`
 * attribute. Applies responsive overflow locking (`lg:overflow-auto`).
 */
import { removeTrapFocus, trapFocus } from '@/lib/a11y'
import { must } from '@/lib/dom'
import DetailsModal from './details-modal'

class HeaderDrawer extends DetailsModal {
  open(event: MouseEvent) {
    setTimeout(() => {
      this.detailsContainer.classList.add('menu-opening')
    })
    const onBodyClickEvent =
      this.onBodyClickEvent || ((e: MouseEvent) => this.onBodyClick(e))
    this.onBodyClickEvent = onBodyClickEvent
    ;(event.target as HTMLElement)
      .closest('details')!
      .setAttribute('open', 'true')
    document.body.addEventListener('click', onBodyClickEvent)
    document.body.classList.add('overflow-hidden', 'lg:overflow-auto')

    trapFocus(must(this.detailsContainer, '[tabindex="-1"]'))
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null)
    if (this.onBodyClickEvent) {
      document.body.removeEventListener('click', this.onBodyClickEvent)
    }
    this.detailsContainer.classList.remove('menu-opening')
    document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
    this.closeAnimation()
  }

  closeAnimation() {
    let animationStart: number | undefined

    const handleAnimation = (time: number) => {
      if (animationStart === undefined) {
        animationStart = time
      }
      const elapsedTime = time - animationStart

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation)
      } else {
        this.detailsContainer.removeAttribute('open')
      }
    }

    window.requestAnimationFrame(handleAnimation)
  }

  disconnectedCallback() {
    if (this.isOpen()) {
      document.body.classList.remove('lg:overflow-auto')
    }
    super.disconnectedCallback()
  }
}

window.customElements.define('header-drawer', HeaderDrawer)
