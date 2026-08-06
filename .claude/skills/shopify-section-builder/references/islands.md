# Island Web Components Reference

How to build interactive islands for the theme's hydration system.

## Table of Contents

1. [Island Architecture](#island-architecture)
2. [Hydration Directives](#hydration-directives)
3. [Island Template](#island-template)
4. [Common Patterns](#common-patterns)
5. [Shopify API Integration](#shopify-api-integration)

---

## Island Architecture

Islands are Web Components that extend `HTMLElement`. They provide client-side interactivity for sections that need it (sliders, accordions, carts, tabs, etc.). The hydration engine (`frontend/lib/revive.js`) uses a `MutationObserver` to detect custom elements in the DOM and dynamically imports their module from `frontend/islands/`.

This means:
- Islands are lazy-loaded — no up-front JS bundle cost
- Islands hydrate independently — one slow island doesn't block others
- Islands work with progressive enhancement — the Liquid renders the content server-side, and the island enhances it

File location: `frontend/islands/<island-name>.js`

Naming convention: The filename matches the custom element tag name. A file called `product-form.js` defines a `<product-form>` element.

---

## Hydration Directives

Add these as attributes on the custom element in Liquid to control when the island's JS loads and executes:

| Directive | When it hydrates | Use for |
|-----------|-----------------|---------|
| `client:idle` | When the main thread is free (`requestIdleCallback`) | Non-critical interactivity — accordions, tabs, toggles |
| `client:visible` | When the element enters the viewport (`IntersectionObserver`) | Below-the-fold content — carousels, lazy forms, animations |
| `client:media` | When a media query matches | Interactions that only apply at certain breakpoints |

Usage in Liquid:
```liquid
<product-form client:visible>
  <!-- Server-rendered form markup -->
</product-form>
```

Choose the most appropriate directive:
- **Above the fold, critical path** → `client:idle` (hydrates ASAP once main thread is free)
- **Below the fold** → `client:visible` (don't load JS until user scrolls to it)
- **Desktop-only interaction** → `client:media="(min-width: 768px)"`

---

## Island Template

Every island follows this structure:

```javascript
class MyIsland extends window.HTMLElement {
  constructor() {
    super()
    // Bind methods
    this.handleClick = this.handleClick.bind(this)
  }

  connectedCallback() {
    // Runs when the element is added to the DOM (after hydration)
    // Set up event listeners, initialize state, query child elements
    this.button = this.querySelector('[data-action]')
    this.button?.addEventListener('click', this.handleClick)
  }

  disconnectedCallback() {
    // Clean up event listeners when element is removed
    this.button?.removeEventListener('click', this.handleClick)
  }

  handleClick(event) {
    // Handle interaction
  }
}

window.customElements.define('my-island', MyIsland)
```

Rules:
- Always bind methods in the constructor (or use arrow functions as class fields)
- Set up event listeners in `connectedCallback`, not the constructor
- Clean up in `disconnectedCallback` to prevent memory leaks
- Query child elements with `this.querySelector()` — scoped to the island
- Use `data-*` attributes to find elements rather than classes (classes are for styling)
- Don't use Shadow DOM — the island's children are rendered by Liquid and styled by Tailwind

---

## Common Patterns

### Reading Attributes from Liquid

Pass data from Liquid to the island via HTML attributes:

```liquid
<product-form
  client:visible
  data-product-id="{{ product.id }}"
  data-variant-id="{{ product.selected_or_first_available_variant.id }}"
>
```

```javascript
connectedCallback() {
  this.productId = this.getAttribute('data-product-id')
  this.variantId = this.getAttribute('data-variant-id')
}
```

### Reactive Attribute Changes

If settings might change in the theme editor preview, observe attributes:

```javascript
static get observedAttributes() {
  return ['data-variant-id']
}

attributeChangedCallback(name, oldValue, newValue) {
  if (name === 'data-variant-id' && oldValue !== newValue) {
    this.variantId = newValue
    this.updateForm()
  }
}
```

### Emitting Custom Events

Islands communicate with each other via custom events on `document`:

```javascript
// In one island — dispatch
document.dispatchEvent(
  new CustomEvent('variant:change', {
    detail: { variantId: this.variantId }
  })
)

// In another island — listen
connectedCallback() {
  this._onVariantChange = (e) => this.handleVariantChange(e.detail)
  document.addEventListener('variant:change', this._onVariantChange)
}

disconnectedCallback() {
  document.removeEventListener('variant:change', this._onVariantChange)
}
```

### Accordion / Toggle

```javascript
class AccordionGroup extends window.HTMLElement {
  connectedCallback() {
    this.items = this.querySelectorAll('[data-accordion-item]')
    this.items.forEach((item) => {
      const trigger = item.querySelector('[data-accordion-trigger]')
      trigger?.addEventListener('click', () => this.toggle(item))
    })
  }

  toggle(targetItem) {
    const content = targetItem.querySelector('[data-accordion-content]')
    const isOpen = targetItem.getAttribute('data-open') === 'true'

    // Close all others
    this.items.forEach((item) => {
      if (item !== targetItem) {
        item.setAttribute('data-open', 'false')
        const c = item.querySelector('[data-accordion-content]')
        if (c) c.style.maxHeight = null
      }
    })

    // Toggle target
    targetItem.setAttribute('data-open', String(!isOpen))
    if (!isOpen) {
      content.style.maxHeight = content.scrollHeight + 'px'
    } else {
      content.style.maxHeight = null
    }
  }
}

window.customElements.define('accordion-group', AccordionGroup)
```

---

## Shopify API Integration

Islands that interact with Shopify's AJAX API (cart, product recommendations, predictive search) use the theme's shared utilities.

### Routes

Shopify endpoint URLs are available on `window.routes`:

```javascript
const cartAddUrl = window.routes.cart_add_url     // /cart/add.js
const cartChangeUrl = window.routes.cart_change_url // /cart/change.js
const cartUpdateUrl = window.routes.cart_update_url // /cart/update.js
```

### Fetch Config

Use `fetchConfig()` from `frontend/lib/utils.js` for POST requests:

```javascript
import { fetchConfig } from '@/lib/utils.js'

async addToCart(variantId, quantity = 1) {
  const response = await fetch(window.routes.cart_add_url, {
    ...fetchConfig(),
    body: JSON.stringify({
      id: variantId,
      quantity: quantity
    })
  })

  if (!response.ok) throw new Error('Failed to add to cart')
  return response.json()
}
```

`fetchConfig()` returns headers with `Content-Type: application/json` and the required Shopify request headers.

### Section Rendering API

To re-render a section without a full page reload (e.g., after a cart update):

```javascript
async refreshSection(sectionId) {
  const url = `${window.location.pathname}?sections=${sectionId}`
  const response = await fetch(url)
  const data = await response.json()
  const html = new DOMParser().parseFromString(data[sectionId], 'text/html')
  const newContent = html.querySelector(`#section-${sectionId}`)
  if (newContent) {
    this.closest('section').replaceWith(newContent)
  }
}
```
