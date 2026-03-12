/**
 * Sentry Error Tracking
 *
 * Initializes Sentry when a DSN is configured in Theme Settings > Developer tools.
 * Session Replay is production-only. Cart errors are captured automatically via
 * the onCartEvent('error') listener.
 *
 * To test from the browser console:
 *
 *   // Cart error (captured with cart_action tag):
 *   document.dispatchEvent(new CustomEvent('cart:error', {
 *     detail: { error: new Error('Test cart error'), action: 'add' },
 *     bubbles: true
 *   }))
 *
 *   // Global unhandled error (captured by Sentry's window.onerror):
 *   setTimeout(() => { throw new Error('Test global error') }, 0)
 */
import * as Sentry from '@sentry/browser'
import { replayIntegration } from '@sentry/browser'
import { onCartEvent } from '@/lib/cart-events'

const dsn = window.__SENTRY_DSN__
const isEnabled = Boolean(dsn)
const isProd = import.meta.env.MODE === 'production'

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: isProd ? [replayIntegration()] : [],
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    initialScope: {
      tags: { shopify_design_mode: window.__SHOPIFY_DESIGN_MODE__ ?? false },
    },
  })

  onCartEvent('error', ({ error, action }) => {
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { cart_action: action }, extra: { action, originalError: error } },
    )
  })
}

export function captureException(error, context) {
  if (!isEnabled) return
  Sentry.captureException(error, context)
}
