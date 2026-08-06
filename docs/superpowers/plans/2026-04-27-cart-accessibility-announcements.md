# Cart Accessibility Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `aria-hidden` toggling pattern on the cart's accessibility live region with a reliable announcement helper that emits contextual messages (added, removed, updated, quantity-limit, error) on every cart change.

**Architecture:** Extract live-region announcement logic into a focused `cart-live-region.js` module that uses a clear-then-set pattern so screen readers re-announce repeat or rapid messages. Move the live region `<p>` from the cart-products block to the layout so announcements work everywhere (cart page AND cart drawer). Wire global listeners for `cart:added`, `cart:removed`, `cart:updated`, and `cart:error` events from `cart-init.js`. Refactor `cart-items.js` to call `announce()` directly only for the special "quantity limit reached" case (overriding the generic `cart:updated` announcement). Delete the now-unused `cart-live-region-text` Liquid section.

**Tech Stack:** Vanilla JS (Web Components), Vitest + jsdom, Shopify Liquid, Tailwind CSS.

---

## File Structure

**Create:**

- `frontend/lib/cart-live-region.js` — `announce(message)` helper + `initCartAnnouncements()` event wiring
- `frontend/lib/cart-live-region.test.js` — Unit tests with jsdom

**Modify:**

- `frontend/islands/cart-items.js` — Remove `cart-live-region-text` from `getSectionsToRender()`, refactor `updateLiveRegions()` to use `announce()`, drop `aria-hidden` toggling on the live region
- `frontend/lib/cart-init.js` — Call `initCartAnnouncements()` at module load
- `layout/theme.liquid` — Move the live region `<p>` here so it's globally available; add new `cartStrings` keys
- `snippets/theme-global-object.liquid` — Mirror new `cartStrings` keys (parallel script-injection point)
- `blocks/cart-products.liquid` — Remove the live region `<p>` (now lives in layout)
- `locales/en.default.json` — Add `accessibility.cart_announcements.{added,removed,updated}` translation keys

**Delete:**

- `sections/cart-live-region-text.liquid` — Section is no longer rendered or referenced

---

## Task 1: Create `cart-live-region.js` module with TDD

**Files:**

- Create: `frontend/lib/cart-live-region.test.js`
- Create: `frontend/lib/cart-live-region.js`

- [ ] **Step 1: Write failing tests for `announce()`**

Create `frontend/lib/cart-live-region.test.js`:

```javascript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { announce } from './cart-live-region.js'

describe('announce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<p id="cart-live-region-text" aria-live="polite" role="status"></p>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('writes the message to the live region after the delay', () => {
    announce('Item added to cart')
    const region = document.getElementById('cart-live-region-text')

    expect(region.textContent).toBe('')

    vi.runAllTimers()
    expect(region.textContent).toBe('Item added to cart')
  })

  it('clears the region before writing so identical messages re-trigger', () => {
    const region = document.getElementById('cart-live-region-text')
    region.textContent = 'Item added to cart'

    announce('Item added to cart')

    expect(region.textContent).toBe('')

    vi.runAllTimers()
    expect(region.textContent).toBe('Item added to cart')
  })

  it('cancels the previous announcement when called rapidly', () => {
    announce('First message')
    announce('Second message')

    vi.runAllTimers()

    const region = document.getElementById('cart-live-region-text')
    expect(region.textContent).toBe('Second message')
  })

  it('no-ops silently when the live region element is missing', () => {
    document.body.innerHTML = ''
    expect(() => announce('Anything')).not.toThrow()
    vi.runAllTimers()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run frontend/lib/cart-live-region.test.js`
Expected: FAIL — module `./cart-live-region.js` not found.

- [ ] **Step 3: Implement `announce()`**

Create `frontend/lib/cart-live-region.js`:

```javascript
/**
 * @file Cart accessibility live-region announcer.
 *
 * Announces cart changes to screen readers via the global
 * `<p id="cart-live-region-text">` element rendered in `layout/theme.liquid`.
 *
 * The clear-then-set pattern below is intentional: setting `textContent`
 * to the same string a second time does NOT trigger an `aria-live`
 * announcement, so we always blank the region first, then write the new
 * message in a microtask so the DOM mutation is observed as a true change.
 */
import { onCartEvent } from './cart-events.js'

const ANNOUNCE_DELAY_MS = 50

let pendingTimer = null

/**
 * Announce a message to the cart live region.
 * Repeated calls cancel any pending announcement (last write wins).
 * No-ops if the live region element is not on the page.
 * @param {string} message
 */
export function announce(message) {
  const region = document.getElementById('cart-live-region-text')
  if (!region) return

  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
  }

  region.textContent = ''
  pendingTimer = setTimeout(() => {
    region.textContent = message
    pendingTimer = null
  }, ANNOUNCE_DELAY_MS)
}

/**
 * Wire global cart events to live-region announcements.
 * Call once at app boot from `cart-init.js`.
 */
export function initCartAnnouncements() {
  onCartEvent('added', () => {
    announce(window.cartStrings?.added)
  })
  onCartEvent('removed', () => {
    announce(window.cartStrings?.removed)
  })
  onCartEvent('updated', () => {
    announce(window.cartStrings?.updated)
  })
  onCartEvent('error', ({ error }) => {
    announce(error || window.cartStrings?.error)
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run frontend/lib/cart-live-region.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Add tests for `initCartAnnouncements()`**

Append to `frontend/lib/cart-live-region.test.js`:

```javascript
import { dispatchCartEvent } from './cart-events.js'
import { initCartAnnouncements } from './cart-live-region.js'

describe('initCartAnnouncements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<p id="cart-live-region-text" aria-live="polite" role="status"></p>'
    window.cartStrings = {
      added: 'Item added to cart',
      removed: 'Item removed from cart',
      updated: 'Cart updated',
      error: 'Cart error'
    }
    initCartAnnouncements()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    delete window.cartStrings
  })

  it('announces "added" string on cart:added', () => {
    dispatchCartEvent('added', { variantId: 1 })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Item added to cart'
    )
  })

  it('announces "removed" string on cart:removed', () => {
    dispatchCartEvent('removed', { line: '1' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Item removed from cart'
    )
  })

  it('announces "updated" string on cart:updated', () => {
    dispatchCartEvent('updated', { line: '1' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Cart updated'
    )
  })

  it('announces error detail on cart:error', () => {
    dispatchCartEvent('error', { error: 'Out of stock', action: 'add' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Out of stock'
    )
  })

  it('falls back to default error string when error detail is missing', () => {
    dispatchCartEvent('error', { action: 'add' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Cart error'
    )
  })
})
```

- [ ] **Step 6: Run all cart-live-region tests**

Run: `npx vitest run frontend/lib/cart-live-region.test.js`
Expected: PASS — all 9 tests pass.

> **Note on test isolation:** `initCartAnnouncements()` adds document-level event listeners and does not return a teardown. Calling it twice will register the listeners twice. The `beforeEach` here calls it fresh per test. If this becomes a problem (e.g., listener counts in later tests), refactor `initCartAnnouncements` to return an unsubscribe function — but do that in a follow-up, not this plan.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/cart-live-region.js frontend/lib/cart-live-region.test.js
git commit -m "$(cat <<'EOF'
feat: add cart live-region announcer with event wiring

Introduces a focused `announce()` helper that uses a clear-then-set
pattern so screen readers reliably announce repeated and rapid cart
changes. `initCartAnnouncements()` wires global cart events (added,
removed, updated, error) to the announcer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add translation keys for announcement strings

**Files:**

- Modify: `locales/en.default.json` (under `accessibility`)

- [ ] **Step 1: Add three new keys**

Open `locales/en.default.json`. Find the `"accessibility"` block (around line 49–56):

```json
"accessibility": {
  "skip_to_text": "Skip to content",
  "close": "Close",
  "unit_price_separator": "per",
  "link_messages": {
    "new_window": "Opens in a new window."
  },
  "loading": "Loading...",
  "error": "Error"
},
```

Add a new `cart_announcements` object inside `accessibility`:

```json
"accessibility": {
  "skip_to_text": "Skip to content",
  "close": "Close",
  "unit_price_separator": "per",
  "link_messages": {
    "new_window": "Opens in a new window."
  },
  "loading": "Loading...",
  "error": "Error",
  "cart_announcements": {
    "added": "Item added to cart",
    "removed": "Item removed from cart",
    "updated": "Cart updated"
  }
},
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/en.default.json', 'utf8'))"`
Expected: No output, no error.

- [ ] **Step 3: Run prettier to keep formatting consistent**

Run: `npm run format`
Expected: Reformats `locales/en.default.json` if needed; exits clean.

- [ ] **Step 4: Commit**

```bash
git add locales/en.default.json
git commit -m "$(cat <<'EOF'
feat: add accessibility.cart_announcements translation keys

Adds added/removed/updated strings for the cart live-region
announcer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Expose the new strings via `window.cartStrings`

**Files:**

- Modify: `layout/theme.liquid:110-113`
- Modify: `snippets/theme-global-object.liquid:11-14`

- [ ] **Step 1: Add three keys to `window.cartStrings` in `layout/theme.liquid`**

Replace the existing `window.cartStrings = { ... }` block at `layout/theme.liquid:110-113`:

```liquid
window.cartStrings = { error: `{{ 'sections.cart.cart_error' | t }}`,
quantityError: `
{{- 'sections.cart.cart_quantity_error_html' | t: quantity: '[quantity]' -}}
` }
```

…with:

```liquid
window.cartStrings = { error: `{{ 'sections.cart.cart_error' | t }}`,
quantityError: `
{{- 'sections.cart.cart_quantity_error_html' | t: quantity: '[quantity]' -}}
`, added: `{{ 'accessibility.cart_announcements.added' | t }}`, removed: `
{{- 'accessibility.cart_announcements.removed' | t -}}
`, updated: `{{ 'accessibility.cart_announcements.updated' | t }}` }
```

- [ ] **Step 2: Mirror the change in `snippets/theme-global-object.liquid`**

Replace the existing `cartStrings` block at `snippets/theme-global-object.liquid:11-14`:

```liquid
cartStrings: { error: `{{ 'sections.cart.cart_error' | t }}`, quantityError: `
{{- 'sections.cart.cart_quantity_error_html' | t: quantity: '[quantity]' -}}
` },
```

…with:

```liquid
cartStrings: { error: `{{ 'sections.cart.cart_error' | t }}`, quantityError: `
{{- 'sections.cart.cart_quantity_error_html' | t: quantity: '[quantity]' -}}
`, added: `{{ 'accessibility.cart_announcements.added' | t }}`, removed: `
{{- 'accessibility.cart_announcements.removed' | t -}}
`, updated: `{{ 'accessibility.cart_announcements.updated' | t }}` },
```

> **Note:** `snippets/theme-global-object.liquid` already has an unrelated syntax bug on line 6 (`routes =` instead of `routes:`). Do **not** fix it as part of this task — staying scoped is more important than the cleanup. Flag it in the PR description for a follow-up.

- [ ] **Step 3: Run prettier**

Run: `npm run format`
Expected: Files reformat if needed; exits clean.

- [ ] **Step 4: Commit**

```bash
git add layout/theme.liquid snippets/theme-global-object.liquid
git commit -m "$(cat <<'EOF'
feat: expose cart announcement strings on window.cartStrings

Adds added/removed/updated strings to the cartStrings global so
the live-region announcer can read translated strings at runtime.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Move the live region element to the layout

**Files:**

- Modify: `layout/theme.liquid` (add the `<p>` near the existing `<a id="a11y-new-window-message">` hidden list)
- Modify: `blocks/cart-products.liquid:251` (remove the `<p>`)

- [ ] **Step 1: Add the live region to `layout/theme.liquid`**

Find the `<ul hidden>` block at `layout/theme.liquid:99-101`:

```liquid
<ul hidden>
  <li id='a11y-new-window-message'>
    {{ 'accessibility.link_messages.new_window' | t }}
  </li>
</ul>
```

Add the live region `<p>` immediately after it (before the `<script>` tag at line 103):

```liquid
<ul hidden>
  <li id='a11y-new-window-message'>
    {{ 'accessibility.link_messages.new_window' | t }}
  </li>
</ul>

<p
  class='sr-only'
  id='cart-live-region-text'
  aria-live='polite'
  role='status'
></p>
```

- [ ] **Step 2: Remove the live region from `blocks/cart-products.liquid`**

At `blocks/cart-products.liquid:251`, delete this line:

```liquid
<p
  class='sr-only'
  id='cart-live-region-text'
  aria-live='polite'
  role='status'
></p>
```

Leave the `<p id="shopping-cart-line-item-status">` line below it untouched — it's a separate live region for loading state.

- [ ] **Step 3: Verify only the layout has the ID now**

Run: `grep -rn "cart-live-region-text" --include="*.liquid"`
Expected output:

```
layout/theme.liquid:<line>:    <p
```

…and nothing else (no matches in `blocks/`, `sections/` content references, etc.).

- [ ] **Step 4: Commit**

```bash
git add layout/theme.liquid blocks/cart-products.liquid
git commit -m "$(cat <<'EOF'
refactor: move cart live region from cart block to layout

Hoists the cart accessibility live region to the global layout so
announcements work on every page, including non-cart pages where the
cart drawer is opened.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire announcements at app boot

**Files:**

- Modify: `frontend/lib/cart-init.js`

- [ ] **Step 1: Import and call `initCartAnnouncements()`**

Replace the entire contents of `frontend/lib/cart-init.js`:

```javascript
import { addToCart } from '@/lib/cart-api'
import { initCartAnnouncements } from './cart-live-region'
import { onCartEvent } from './cart-events'

// Listen for cart:add events
onCartEvent('add', addToCart)

// Wire cart event lifecycle to accessibility announcements
initCartAnnouncements()
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (including the 9 new cart-live-region tests).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/cart-init.js
git commit -m "$(cat <<'EOF'
feat: initialize cart accessibility announcements at boot

Wires the cart live-region announcer to global cart events
(added, removed, updated, error) from the bootstrap module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Refactor `cart-items.js` to drop the broken pattern

**Files:**

- Modify: `frontend/islands/cart-items.js`

This task: (1) removes `cart-live-region-text` from `getSectionsToRender()`, (2) refactors `updateLiveRegions()` to call `announce()` directly only for the special "quantity-limit-reached" case, and (3) drops `aria-hidden` toggling on the live region.

The line-item loading-status `aria-hidden` toggling is **intentionally left untouched** — it's a separate, working live region used for loading state, not part of this refactor.

- [ ] **Step 1: Remove `cart-live-region-text` from the sections list**

In `frontend/islands/cart-items.js`, find the `getSectionsToRender()` method (lines 50-73):

```javascript
  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'cart-subtotal',
        section: 'cart-subtotal',
        selector: '.shopify-section'
      }
    ]
  }
```

Replace with (drop the middle `cart-live-region-text` entry):

```javascript
  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-subtotal',
        section: 'cart-subtotal',
        selector: '.shopify-section'
      }
    ]
  }
```

- [ ] **Step 2: Add the `announce` import**

At the top of `frontend/islands/cart-items.js`, just below the existing imports:

```javascript
import { debounce } from '@/lib/utils'
import { trapFocus } from '@/lib/a11y'
import { updateCartItem } from '@/lib/cart-api'
```

…add:

```javascript
import { debounce } from '@/lib/utils'
import { trapFocus } from '@/lib/a11y'
import { updateCartItem } from '@/lib/cart-api'
import { announce } from '@/lib/cart-live-region'
```

- [ ] **Step 3: Refactor `updateLiveRegions()` to use `announce()` and drop `aria-hidden` toggling**

Find the `updateLiveRegions()` method at `frontend/islands/cart-items.js:169-194`:

```javascript
  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`)
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`)
      lineItemError.innerHTML = window.cartStrings.quantityError.replace(
        '[quantity]',
        quantityElement.value
      )
    }

    this.currentItemCount = itemCount
    this.lineItemStatusElement.setAttribute('aria-hidden', true)

    const cartStatus =
      document.getElementById('cart-live-region-text') ||
      document.getElementById('CartDrawer-LiveRegionText')
    cartStatus.setAttribute('aria-hidden', false)

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true)
    }, 1000)
  }
```

Replace with:

```javascript
  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`)
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`)

      const message = window.cartStrings.quantityError.replace(
        '[quantity]',
        quantityElement.value
      )
      lineItemError.innerHTML = message

      // Override the generic cart:updated announcement scheduled by
      // initCartAnnouncements with the more specific quantity-limit message.
      // announce() cancels any pending announcement, so this wins.
      announce(stripHtml(message))
    }

    this.currentItemCount = itemCount
    this.lineItemStatusElement.setAttribute('aria-hidden', true)
  }
```

- [ ] **Step 4: Add the `stripHtml` helper**

The `quantityError` string is HTML (`cart_quantity_error_html`). Screen readers should hear the text only, not tags. Add a small helper at the bottom of `frontend/islands/cart-items.js`, just before `window.customElements.define(...)`:

```javascript
function stripHtml(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}
```

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/islands/cart-items.js
git commit -m "$(cat <<'EOF'
refactor: replace aria-hidden toggling with announce() helper

cart-items.js now relies on global cart events (wired in
cart-init.js) for normal added/removed/updated announcements and
only calls announce() directly to override the generic message
when a quantity limit is reached. The cart-live-region-text entry
is removed from getSectionsToRender() since the live region is
no longer driven by section re-rendering.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Delete the obsolete section file

**Files:**

- Delete: `sections/cart-live-region-text.liquid`

- [ ] **Step 1: Verify nothing references the section**

Run: `grep -rn "cart-live-region-text" --include="*.liquid" --include="*.js" --include="*.json"`
Expected: matches only in `layout/theme.liquid` (the live region element) and `frontend/lib/cart-live-region.js` (the `getElementById` lookup) — **no references** to the section as a section (no `{% section 'cart-live-region-text' %}`, no entry in any `getSectionsToRender()`, no template reference).

If any reference is found, stop and resolve it before deleting.

- [ ] **Step 2: Delete the file**

Run: `git rm sections/cart-live-region-text.liquid`
Expected: file removed and staged for commit.

- [ ] **Step 3: Run the test suite one more time**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Run the build to make sure nothing else breaks**

Run: `npm run build`
Expected: Build completes successfully (vitest runs first, then vite bundles assets).

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: remove obsolete cart-live-region-text section

The live region is now a static element in the layout, written to
directly by the announce() helper. The section file is no longer
rendered or fetched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Manual QA with a screen reader

This is verification, not automation — it confirms the announcements actually reach assistive technology.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev -- --store <store-name>`
Expected: Vite dev server + Shopify CLI both start.

- [ ] **Step 2: Open the cart page with VoiceOver enabled (macOS)**

- Navigate to `/cart` with at least one item already in the cart.
- Toggle VoiceOver: `Cmd+F5`.
- Bring focus to a quantity input.

- [ ] **Step 3: Increase the quantity**

Expected announcement: "Cart updated"

- [ ] **Step 4: Decrease the quantity to 0**

Expected announcement: "Item removed from cart"

- [ ] **Step 5: Try to set the quantity above the available inventory** (use a low-stock variant if available)

Expected announcement: the quantityError text (e.g., "You can only add N of this item to your cart") — not "Cart updated".

- [ ] **Step 6: Trigger an error** (use devtools to throttle to "Offline" before changing a quantity)

Expected announcement: "There was an error while updating your cart. Please try again."

- [ ] **Step 7: From a non-cart page, open the cart drawer and add/remove items**

Expected: announcements still fire (because the live region now lives in the layout). If they don't fire, confirm `cart:added` / `cart:removed` events are dispatched from `cart-api.js` for drawer actions — they should be, but verify via `document.addEventListener('cart:added', console.log)` in the console.

- [ ] **Step 8: Toggle VoiceOver off**

`Cmd+F5`.

> **If any announcement is missing or wrong**, the most likely root causes are:
>
> - `window.cartStrings.<key>` is undefined → check that Task 3's edits to `theme.liquid` survived a hard refresh.
> - The event isn't being dispatched → set a console listener on the relevant `cart:*` event and reproduce.
> - The live region element isn't on the page → inspect the DOM, confirm the `<p id="cart-live-region-text">` is present.

---

## Self-Review Notes

**Spec coverage:**

- ✅ Drop `aria-hidden` toggling — Task 6 step 3 removes both toggle calls on the live region.
- ✅ Announce contextual messages (added/removed/updated/error) — Task 1 wires all four events.
- ✅ Use clear-on-delay so consecutive identical messages re-trigger — Task 1 step 3 implements clear-then-set with a 50ms delay.
- ✅ Override generic message for quantity-limit case — Task 6 step 3 calls `announce()` directly with the specific error.
- ✅ Drawer announcements work too — Task 4 moves the element to the layout.

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate error handling"/etc. All code blocks contain literal code.

**Type/name consistency:**

- `announce(message)` signature matches everywhere: tests, `initCartAnnouncements`, `cart-items.js`.
- `initCartAnnouncements` (no args) — consistent.
- `window.cartStrings.added` / `.removed` / `.updated` / `.error` — keys consistent across `theme.liquid`, `theme-global-object.liquid`, the announcer, and the tests.
- `id="cart-live-region-text"` — consistent across layout, announcer, and tests.

**Out of scope (intentionally not addressed):**

- The unrelated `routes =` syntax bug in `snippets/theme-global-object.liquid:6` — flagged in Task 3 step 2 note.
- The `shopping-cart-line-item-status` loading-state live region's separate `aria-hidden` toggling — different live region with different purpose.
- A new `cart:limit-reached` event — kept simple by overriding via direct `announce()` call instead.
