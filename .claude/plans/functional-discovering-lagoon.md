# Plan: Integrate Sentry Error Tracking

## Context

This Shopify theme has no error tracking. Errors in cart operations, island hydration, and fetch calls are either shown to the user via DOM text or silently logged to `console.error`. We need Sentry to capture all frontend errors globally, with richer context on cart operations — and ready for the upcoming Klaviyo integration.

The DSN must be configurable per store via Shopify theme settings so no code changes are needed when deploying to different stores.

## Approach

Install `@sentry/browser` via npm (bundled by Vite). DSN flows from **Theme Settings → Liquid window global → JS init**. Sentry initializes as the very first import in `theme.js` to catch early errors. Cart errors are captured centrally via the existing `onCartEvent('error', ...)` system — no modifications needed to `cart-api.js`, `cart-items.js`, or `cart-note.js`.

## Steps

### 1. Install `@sentry/browser`

```bash
npm install @sentry/browser
```

Adds as a `dependency` (not devDep) — this is runtime code shipped to browsers.

### 2. Add DSN theme setting — `config/settings_schema.json`

Add a new "Developer tools" group at the end of the array:

```json
{
  "name": "Developer tools",
  "settings": [
    {
      "type": "text",
      "id": "sentry_dsn",
      "label": "Sentry DSN",
      "info": "Paste your Sentry DSN to enable error tracking. Leave blank to disable."
    }
  ]
}
```

### 3. Expose DSN in `<head>` — `layout/theme.liquid`

Add an inline `<script>` block **before** the vite-tag lines (before line 61) so the global is available before any module JS evaluates:

```liquid
<script>
  {%- if settings.sentry_dsn != blank -%}
    window.__SENTRY_DSN__ = {{ settings.sentry_dsn | json }};
  {%- endif -%}
  window.__SHOPIFY_DESIGN_MODE__ = {{ request.design_mode | json }};
</script>
```

- `| json` filter escapes the string safely (XSS-safe)
- `__SENTRY_DSN__` is simply absent when no DSN is configured — JS checks for this
- `__SHOPIFY_DESIGN_MODE__` lets Sentry tag noisy theme-editor errors

### 4. Create `frontend/lib/sentry.js`

New file — Sentry init + centralized cart error listener + safe `captureException` export:

```js
import * as Sentry from '@sentry/browser'
import { replayIntegration } from '@sentry/browser'
import { onCartEvent } from '@/lib/cart-events'

const dsn = window.__SENTRY_DSN__
const isEnabled = Boolean(dsn)

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,  // 'development' or 'production' from Vite
    integrations: [replayIntegration()],
    // Capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    initialScope: {
      tags: { shopify_design_mode: window.__SHOPIFY_DESIGN_MODE__ ?? false }
    }
  })

  // Captures ALL cart errors (add, update, remove, note) automatically
  onCartEvent('error', ({ error, action }) => {
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { cart_action: action }, extra: { action, originalError: error } }
    )
  })
}

export function captureException(error, context) {
  if (!isEnabled) return
  Sentry.captureException(error, context)
}
```

Key design decisions:
- **Session Replay enabled** — 10% baseline sampling, 100% on error. Replay lets you see exactly what the user did before an error occurred
- **`onCartEvent('error')`** covers `cart-api.js`, `cart-items.js`, `cart-note.js` without modifying them
- **`captureException` export** is safe to call even when Sentry is disabled (no DSN)
- **`import.meta.env.MODE`** gives dev/prod environment tagging for free via Vite
- **Klaviyo-ready** — future cart errors automatically captured; non-cart Klaviyo errors use `captureException` directly

### 5. Update `frontend/entrypoints/theme.js`

Add Sentry import as the **first line** (before `vite/modulepreload-polyfill`):

```js
import '@/lib/sentry.js'    // ← new
import 'vite/modulepreload-polyfill'
// ... rest unchanged
```

ES modules evaluate in declaration order, so Sentry's global `window.onerror` and `onunhandledrejection` handlers install before any other code can throw.

### 6. Instrument `frontend/islands/product-recommendations.js`

This is the only error path outside the cart event system:

```js
import { captureException } from '@/lib/sentry.js'
// ... in .catch():
captureException(e, {
  tags: { component: 'product-recommendations' },
  extra: { url: this.dataset.url }
})
console.error(e)  // keep for dev visibility
```

### Files NOT modified

- `cart-api.js` — already dispatches `cart:error`, captured by centralized listener
- `cart-items.js` — same
- `cart-note.js` — same
- All other islands — global handlers cover uncaught exceptions

## File summary

| File | Action |
|------|--------|
| `package.json` | Modify — add `@sentry/browser` dependency |
| `config/settings_schema.json` | Modify — add "Developer tools" settings group |
| `layout/theme.liquid` | Modify — add `<script>` block in `<head>` for DSN + design mode |
| `frontend/lib/sentry.js` | **Create** — init, cart error listener, captureException export |
| `frontend/entrypoints/theme.js` | Modify — add sentry import as first line |
| `frontend/islands/product-recommendations.js` | Modify — add captureException in `.catch()` |

## Verification

1. `npm run build` — confirms Sentry bundles without errors
2. Set a test DSN in Theme Settings → Developer tools → Sentry DSN
3. Trigger a cart error (e.g. invalid line item) and verify it appears in Sentry dashboard
4. Verify no errors are sent when DSN is blank
5. Check `environment` tag reads `'development'` during `npm run dev` and `'production'` after `npm run build`

## Future (not in this PR)

- **Source map upload** via `@sentry/vite-plugin` in `vite.config.js` (requires CI auth token)
- **Klaviyo error tracking** — cart errors auto-captured; non-cart paths import `captureException`
