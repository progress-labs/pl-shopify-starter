/**
 * @file `<sticky-header>` — scroll-aware header that hides/reveals on scroll.
 *
 * Uses an `IntersectionObserver` to capture the initial header bounds, then
 * listens for scroll events to transition between three states:
 * - **hide** — scrolling down past the header: translates it off-screen
 * - **reveal** — scrolling up past the header: makes it sticky and visible
 * - **reset** — scrolled back to the top: removes all sticky/transform classes
 *
 * Integrates with predictive search — scroll handling is paused while
 * `this.predictiveSearch.isOpen` is true.
 */
class StickyHeader extends window.HTMLElement {
  connectedCallback() {
    this.header = document.getElementById('shopify-section-header')
    this.headerBounds = {}
    this.currentScrollTop = 0
    this.preventReveal = false

    this.onScrollHandler = this.onScroll.bind(this)
    this.hideHeaderOnScrollUp = () => {
      this.preventReveal = true
    }

    window.addEventListener('scroll', this.onScrollHandler, false)

    this.createObserver()
  }

  createObserver() {
    const observer = new window.IntersectionObserver((entries, observer) => {
      this.headerBounds = entries[0].intersectionRect
      observer.disconnect()
    })

    observer.observe(this.header)
  }

  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop

    if (this.predictiveSearch && this.predictiveSearch.isOpen) return

    if (
      scrollTop > this.currentScrollTop &&
      scrollTop > this.headerBounds.bottom
    ) {
      if (this.preventHide) return
      window.requestAnimationFrame(this.hide.bind(this))
    } else if (
      scrollTop < this.currentScrollTop &&
      scrollTop > this.headerBounds.bottom
    ) {
      if (!this.preventReveal) {
        window.requestAnimationFrame(this.reveal.bind(this))
      } else {
        window.clearTimeout(this.isScrolling)

        this.isScrolling = setTimeout(() => {
          this.preventReveal = false
        }, 66)

        window.requestAnimationFrame(this.hide.bind(this))
      }
    } else if (scrollTop <= this.headerBounds.top) {
      window.requestAnimationFrame(this.reset.bind(this))
    }

    this.currentScrollTop = scrollTop
  }

  hide() {
    this.header.classList.add('-translate-y-full', 'sticky', 'top-0')
  }

  reveal() {
    this.header.classList.add('sticky', 'top-0', 'transition-transform')
    this.header.classList.remove('-translate-y-full')
  }

  reset() {
    this.header.classList.remove(
      '-translate-y-full',
      'sticky',
      'top-0',
      'transition-transform'
    )
  }
}

window.customElements.define('sticky-header', StickyHeader)
