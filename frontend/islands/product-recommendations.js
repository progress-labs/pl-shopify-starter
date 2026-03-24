import { captureException } from '@/lib/sentry.js'


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
  connectedCallback() {
    fetch(this.dataset.url)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div')
        html.innerHTML = text
        const recommendations = html.querySelector('product-recommendations')

        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML
        }
      })
      .catch((e) => {
        captureException(e, {
          tags: { component: 'product-recommendations' },
          extra: { url: this.dataset.url },
        })
        console.error(e)
      })
  }
}

window.customElements.define('product-recommendations', ProductRecommendations)
