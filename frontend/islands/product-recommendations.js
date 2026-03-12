import { captureException } from '@/lib/sentry.js'

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
