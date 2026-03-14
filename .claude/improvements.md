# Frontend Codebase Improvements

Identified during the JSDoc documentation pass across all 17 frontend files.

## Bugs / Correctness

1. **`utils.js:debounce` loses `this` context** — uses an arrow function that captures the module-level `this` (undefined in ESM) instead of the caller's context. Should use a regular function or explicitly forward `this`.
2. **`cart-items.js:updateQuantity` silently swallows non-JSON responses** — `JSON.parse(state)` will throw on HTML error pages (e.g. 429 rate limit), and the `.catch` handler shows a generic string rather than the actual error.
3. **`details-modal.js:onBodyClick` listener is never removed on disconnect** — if the element is removed from the DOM while open, the body click listener leaks.

## Robustness

4. **No `disconnectedCallback` cleanup anywhere** — `sticky-header` adds a scroll listener, `details-disclosure` adds focusout/toggle listeners, but none of the islands clean up when removed from the DOM.
5. **`revive.js` re-imports islands on every mutation** — if a section re-renders and re-adds the same custom element tag, `islands[path]()` fires again. The browser's `customElements.define` deduplicates the registration, but the module is still re-fetched/executed.
6. **`a11y.js:trapFocusHandlers` is a module-level singleton** — only one focus trap can exist at a time. Opening a nested modal (e.g. drawer → sub-dialog) silently replaces the outer trap.

## Code Quality

7. **`cart-items.js` and `cart-drawer-items.js` reach into the global DOM** — `document.getElementById('main-cart-items')`, `document.querySelector('cart-drawer')`, etc. These tight couplings make the components fragile to markup changes.
8. **Inconsistent error element lookups** — `cart-items.js` falls back between `#cart-errors` and `#CartDrawer-CartErrors` with `||` chains in multiple places. A shared lookup helper or data attribute would reduce duplication.
9. **`localization-form.js` has a duplicate CSS class removal** — `'md:rounded-b-none'` appears twice in the `classList.remove()` call in `hideList()`.
10. **`sticky-header.js` uses deprecated `window.pageYOffset`** — should use `window.scrollY`.
11. **Magic numbers** — `200` (idle fallback), `300` (debounce), `400` (drawer animation), `66` (scroll timeout), `1000` (live region timeout) are all hardcoded with no named constants.

## Architecture

12. **No shared base class or mixin for islands** — every island independently extends `HTMLElement`. A thin base class could standardize `disconnectedCallback` cleanup, error handling, and attribute observation.
13. **`cart-items.js` handles both cart page and drawer logic** — the `||` fallback pattern throughout (`getElementById('X') || getElementById('CartDrawer-X')`) suggests this should be two distinct components sharing a base, rather than one component with conditional DOM queries (which `cart-drawer-items` partially addresses but doesn't fully separate).
14. **No error boundaries on island hydration** — if an island's module throws during import, `revive.js` doesn't catch it, which could halt the DFS walk for sibling elements.
15. **`fetchConfig()` always returns POST** — any future GET-based API call would need a separate utility or override pattern.

## DX / Tooling

16. **No TypeScript or `// @ts-check`** — the JSDoc types aren't validated by anything. Adding `// @ts-check` to files or a `tsconfig.json` with `checkJs: true` would catch type errors.
17. **No tests** — none of the island logic, cart API interactions, or a11y utilities have test coverage.
