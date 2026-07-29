export {}

/** Minimal contract for the <cart-drawer> element, consumed by cart-api. */
interface CartDrawerElement extends HTMLElement {
  getSectionsToRender(): { id: string }[]
}

declare global {
  interface Window {
    routes: {
      cart_add_url: string
      cart_change_url: string
      cart_update_url: string
      cart_url: string
    }
    cartStrings: Record<string, string>
    variantStrings: Record<string, string>
    __SENTRY_DSN__?: string
    __SHOPIFY_DESIGN_MODE__?: boolean
  }

  interface HTMLElementTagNameMap {
    'cart-drawer': CartDrawerElement
  }
}
