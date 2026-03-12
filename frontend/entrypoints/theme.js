/**
 * Theme Entrypoint
 *
 * Bootstraps the client-side runtime:
 * 1. Loads the Vite modulepreload polyfill
 * 2. Initialises the cart event API (side-effect import)
 * 3. Boots the island hydration engine for all `frontend/islands/` modules
 * 4. Enhances native `<details>` disclosure widgets with ARIA attributes
 */
import '@/lib/sentry.js'
import 'vite/modulepreload-polyfill'
import { initDisclosureWidgets } from '@/lib/a11y'
import { revive, islands } from '@/lib/revive.js'
import '@/lib/cart-api.js'

const summaries = document.querySelectorAll('[id^="Details-"] summary')

revive(islands)
initDisclosureWidgets(summaries)
