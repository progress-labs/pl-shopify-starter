import { captureException } from '@/lib/error-tracking'

/**
 * @file `<product-recommendations>` — fetches and renders product recommendations.
 *
 * On `connectedCallback`, fetches HTML from the URL specified in the
 * `data-url` attribute (a Shopify recommendations endpoint), extracts
 * the inner content of the `<product-recommendations>` element from the
 * response, and replaces its own innerHTML.
 *
 * @attr data-url - Shopify product recommendations endpoint URL (required)
 */

class ProductRecommendations extends window.HTMLElement {
  #controller?: AbortController

  connectedCallback() {
    this.#controller = new AbortController()

    fetch(this.dataset.url as string, { signal: this.#controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((text) => {
        const html = document.createElement('div')
        html.innerHTML = text
        const recommendations = html.querySelector('product-recommendations')

        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        captureException(e, {
          tags: { component: 'product-recommendations' },
          extra: { url: this.dataset.url }
        })
        console.error(e)
      })
  }

  disconnectedCallback() {
    this.#controller?.abort()
  }
}

window.customElements.define('product-recommendations', ProductRecommendations)
