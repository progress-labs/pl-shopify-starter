import type { CartDrawer } from '@/islands/cart-drawer'

export {}

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
    /** Rendered by snippets/theme-global-object.liquid */
    __theme: {
      klaviyo: {
        listId: string | null
      }
    }
  }

  interface HTMLElementTagNameMap {
    'cart-drawer': CartDrawer
  }
}
