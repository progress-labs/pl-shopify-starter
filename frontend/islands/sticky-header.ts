/**
 * @file `<sticky-header>` — scroll-aware header that hides/reveals on scroll.
 *
 * Uses an `IntersectionObserver` to capture the initial header bounds, then
 * listens for scroll events to transition between three states:
 * - **hide** — scrolling down past the header: translates it off-screen
 * - **reveal** — scrolling up past the header: makes it sticky and visible
 * - **reset** — scrolled back to the top: removes all sticky/transform classes
 */
import { must } from '@/lib/dom'

class StickyHeader extends window.HTMLElement {
  header!: HTMLElement
  headerBounds: Partial<DOMRectReadOnly> = {}
  currentScrollTop = 0
  preventReveal = false
  isScrolling?: ReturnType<typeof setTimeout>
  #controller?: AbortController

  connectedCallback() {
    this.header = must(document, '#shopify-section-header')
    this.headerBounds = {}
    this.currentScrollTop = 0
    this.preventReveal = false

    // passive: the handler never calls preventDefault, and a blocking scroll
    // listener stalls compositing. The signal removes it on disconnect —
    // previously every theme-editor re-render stacked another handler.
    this.#controller = new AbortController()
    window.addEventListener('scroll', this.onScroll.bind(this), {
      passive: true,
      signal: this.#controller.signal
    })

    this.createObserver()
  }

  disconnectedCallback() {
    this.#controller?.abort()
    window.clearTimeout(this.isScrolling)
  }

  createObserver() {
    const observer = new window.IntersectionObserver((entries, observer) => {
      this.headerBounds = entries[0].intersectionRect
      observer.disconnect()
    })

    observer.observe(this.header)
  }

  onScroll() {
    const scrollTop = window.scrollY

    if (
      scrollTop > this.currentScrollTop &&
      this.headerBounds.bottom !== undefined &&
      scrollTop > this.headerBounds.bottom
    ) {
      window.requestAnimationFrame(this.hide.bind(this))
    } else if (
      scrollTop < this.currentScrollTop &&
      this.headerBounds.bottom !== undefined &&
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
    } else if (
      this.headerBounds.top !== undefined &&
      scrollTop <= this.headerBounds.top
    ) {
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
