/**
 * @file Theme entrypoint — bootstraps the client-side runtime.
 *
 * Initialization sequence:
 * 1. Polyfills Vite module preloading.
 * 2. Registers the cart API event listeners.
 * 3. Boots the island hydration engine (`revive`), which discovers and
 *    lazily loads all Web Component islands in `frontend/islands/`.
 * 4. Enhances native `<details>` disclosure widgets with ARIA attributes
 *    and keyboard support via `initDisclosureWidgets`.
 */
import 'vite/modulepreload-polyfill'
import { initDisclosureWidgets } from '@/lib/a11y'
import { revive, islands } from '@/lib/revive.js'
import '@/lib/cart-api.js'

const summaries = document.querySelectorAll('[id^="Details-"] summary')

revive(islands)
initDisclosureWidgets(summaries)
