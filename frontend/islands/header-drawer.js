/**
 * @file `<header-drawer>` — slide-out mobile navigation drawer.
 *
 * Extends {@link DetailsModal} with a CSS class-driven open animation
 * (`menu-opening`) and a 400ms `requestAnimationFrame` close delay to
 * allow the closing transition to complete before removing the `open`
 * attribute. Applies responsive overflow locking (`lg:overflow-auto`).
 */
import { removeTrapFocus, trapFocus } from '@/lib/a11y'
import DetailsModal from './details-modal'

class HeaderDrawer extends DetailsModal {
  open(event) {
    setTimeout(() => {
      this.detailsContainer.classList.add('menu-opening')
    })
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this)
    event.target.closest('details').setAttribute('open', true)
    document.body.addEventListener('click', this.onBodyClickEvent)
    document.body.classList.add('overflow-hidden', 'lg:overflow-auto')

    trapFocus(this.detailsContainer.querySelector('[tabindex="-1"]'))
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null)
    document.body.removeEventListener('click', this.onBodyClickEvent)
    this.detailsContainer.classList.remove('menu-opening')
    document.body.classList.remove('overflow-hidden', 'lg:overflow-auto')
    this.closeAnimation()
  }

  closeAnimation() {
    let animationStart

    const handleAnimation = (time) => {
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
}

window.customElements.define('header-drawer', HeaderDrawer)
