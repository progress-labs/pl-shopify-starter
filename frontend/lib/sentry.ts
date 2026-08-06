/**
 * @file Sentry initialization — loaded lazily from the theme entrypoint.
 *
 * This module (and the Sentry SDK it imports) is code-split into its own
 * chunk because its only import path is the dynamic import in
 * entrypoints/theme.ts, gated on a configured DSN (Theme Settings >
 * Developer tools). Never import it statically from islands or libs — use
 * `captureException` from lib/error-tracking instead, which buffers until
 * this module is ready.
 *
 * Session Replay is production-only. Cart errors are captured automatically
 * via the onCartEvent('error') listener.
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
import { setReporter } from '@/lib/error-tracking'

export function initSentry(): void {
  const dsn = window.__SENTRY_DSN__
  if (!dsn) return

  const isProd = import.meta.env.MODE === 'production'

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: isProd ? [replayIntegration()] : [],
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    initialScope: {
      tags: { shopify_design_mode: window.__SHOPIFY_DESIGN_MODE__ ?? false }
    }
  })

  setReporter((error, context) => Sentry.captureException(error, context))

  onCartEvent('error', ({ error, action }) => {
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { cart_action: action } })
    } else {
      Sentry.captureMessage(String(error), {
        level: 'error',
        tags: { cart_action: action },
        fingerprint: ['cart', action, String(error)]
      })
    }
  })
}
