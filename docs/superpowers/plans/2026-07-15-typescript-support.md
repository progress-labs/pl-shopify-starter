# TypeScript Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `frontend/` runtime to TypeScript at `strict: true`, with type errors blocking the build, rolled out in batches behind a dual-extension island glob.

**Architecture:** Phase 0 lays down infrastructure without renaming any file — a `tsconfig.json`, ambient global types, a `must()` query helper that absorbs the null-check tax, a dual-extension (`.js`+`.ts`) island glob so converted and unconverted islands coexist, and `tsc --noEmit` wired into `build`/`deploy` so a type error can't ship green. Then files convert in batches: `lib/` first (so islands inherit real types), then islands by domain, then the scaffolding is removed.

**Tech Stack:** TypeScript 5.9, Vite 7 + esbuild (transpile only — does NOT type-check), vite-plugin-shopify, Vitest 4 (jsdom), typescript-eslint, Prettier.

**Design spec:** `docs/superpowers/specs/2026-07-15-typescript-support-design.md`

## Global Constraints

- **`strict: true` from the first tsconfig** — no file is ever converted at a strictness we later re-tighten.
- **`checkJs: false` during the migration window** — unconverted `.js` must not flood the build; each batch opts in by renaming.
- **The `.js` extension is coupled across three sites and must stay consistent or ALL hydration silently dies** (no console error): `import.meta.glob` in `revive`, the `` `/frontend/islands/${tagName}.js` `` lookup in `revive`, and `render 'vite-tag' with 'theme.js'` in `layout/theme.liquid:70` + `layout/password.liquid:56`. The dual-extension glob (Phase 0) is what makes partial conversion safe.
- **Vite/esbuild strips types without checking them.** `tsc --noEmit` in `build` + `deploy` is the only thing that makes types real. Never remove it.
- **Every batch ends with a manual QA pass**: run `npm run dev`, load a page containing each converted island, confirm it hydrates and behaves. Type-green ≠ working.
- Prettier config (`singleQuote`, `semi: false`, `printWidth: 80`, `trailingComma: 'none'`) already applies to `.ts` with no change. Match it in all code below.
- Tests convert alongside their subject file, never in a lump.

---

## Phase 0 — Infrastructure (no renames)

**Deliverable:** `npm run typecheck` exists and passes; the site behaves identically; nothing is renamed. Independently shippable.

### Task 0.1: Add TypeScript toolchain dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

Run:

```bash
npm install -D typescript@^5.9 typescript-eslint@^8
```

Expected: `package.json` gains `typescript` and `typescript-eslint` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Verify the compiler is available**

Run: `npx tsc --version`
Expected: `Version 5.9.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add typescript and typescript-eslint deps"
```

### Task 0.2: Add tsconfig and the typecheck script

**Files:**

- Create: `tsconfig.json`
- Delete: `jsconfig.json`
- Modify: `package.json` (scripts)

**Interfaces:**

- Produces: `npm run typecheck` → `tsc --noEmit`, exit 0 when clean.

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["frontend/*"],
      "~/*": ["frontend/*"]
    },
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["frontend", "vite.config.js", "vitest.config.js"]
}
```

Notes for the implementer:

- `moduleResolution: bundler` lets `import '@/lib/revive.js'` resolve to `revive.ts` automatically once renamed — so import specifiers with `.js` do NOT need editing when their target becomes `.ts`.
- `skipLibCheck` silences `@sentry/browser` type noise that is not ours to fix.
- `checkJs: false` means the 81 existing JS errors stay dormant until each file is renamed.

- [ ] **Step 2: Delete `jsconfig.json`**

Run: `git rm jsconfig.json`
Expected: `jsconfig.json` removed (its `paths` now live in `tsconfig.json`).

- [ ] **Step 3: Add the `typecheck` script**

In `package.json` `scripts`, add:

```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Run it — expect a clean pass**

Run: `npm run typecheck`
Expected: exit 0, no output. (No `.ts` files exist yet and `.js` is unchecked.)

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json package.json
git commit -m "build: add tsconfig and typecheck script"
```

### Task 0.3: Add ambient global and custom-element types

**Files:**

- Create: `frontend/types/globals.d.ts`

**Interfaces:**

- Produces: typed `window.routes`, `window.cartStrings`, `window.variantStrings`; `document.querySelector('cart-drawer')` returns `CartDrawerElement` (minimal interface — the concrete class replaces it in Batch 2).

- [ ] **Step 1: Create `frontend/types/globals.d.ts`**

```ts
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
  }

  interface HTMLElementTagNameMap {
    'cart-drawer': CartDrawerElement
  }
}
```

- [ ] **Step 2: Typecheck still clean**

Run: `npm run typecheck`
Expected: exit 0. (Ambient `.d.ts` adds declarations; nothing consumes them yet.)

- [ ] **Step 3: Commit**

```bash
git add frontend/types/globals.d.ts
git commit -m "types: add ambient window and custom-element declarations"
```

### Task 0.4: Add the `must()` query helper

**Files:**

- Create: `frontend/lib/dom.ts`
- Test: `frontend/lib/dom.test.ts`

**Interfaces:**

- Produces:
  - `must<K extends keyof HTMLElementTagNameMap>(root: ParentNode, sel: K): HTMLElementTagNameMap[K]`
  - `must<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T`
  - Throws `Error` when the selector matches nothing.

- [ ] **Step 1: Write the failing test**

`frontend/lib/dom.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { must } from './dom'

describe('must', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the matched element', () => {
    document.body.innerHTML = '<div class="x"></div>'
    expect(must(document, '.x')).toBeInstanceOf(HTMLDivElement)
  })

  it('throws when nothing matches', () => {
    document.body.innerHTML = ''
    expect(() => must(document, '.missing')).toThrow(/no element matches/i)
  })
})
```

- [ ] **Step 2: Run it — expect failure**

Run: `npx vitest run frontend/lib/dom.test.ts`
Expected: FAIL — cannot resolve `./dom`.

- [ ] **Step 3: Implement `frontend/lib/dom.ts`**

```ts
/**
 * Query a required descendant. Throws if it is absent, converting a silent
 * `null`-method crash into a loud, located failure at hydration time.
 */
export function must<K extends keyof HTMLElementTagNameMap>(
  root: ParentNode,
  selector: K
): HTMLElementTagNameMap[K]
export function must<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string
): T
export function must(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector)
  if (!el) {
    throw new Error(`must(): no element matches "${selector}"`)
  }
  return el
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `npx vitest run frontend/lib/dom.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/dom.ts frontend/lib/dom.test.ts
git commit -m "feat: add must() required-element query helper"
```

### Task 0.5: Dual-extension island glob (in place, no rename)

**Files:**

- Modify: `frontend/lib/revive.js:74` and `frontend/lib/revive.js:95-115`

**Interfaces:**

- Produces: island loader resolves `.ts` first, then `.js`, so converted and unconverted islands coexist.

- [ ] **Step 1: Change the glob**

`frontend/lib/revive.js:74`, replace:

```js
export const islands = import.meta.glob('@/islands/*.js')
```

with:

```js
export const islands = import.meta.glob('@/islands/*.{js,ts}')
```

- [ ] **Step 2: Change the lookup to try both extensions**

In `dfs`, replace the block at `frontend/lib/revive.js:96-115`:

```js
const tagName = node.tagName.toLowerCase()
const potentialJsPath = `/frontend/islands/${tagName}.js`
const isPotentialCustomElementName = /-/.test(tagName)

if (isPotentialCustomElementName && islands[potentialJsPath]) {
  if (node.hasAttribute('client:visible')) {
    await visible({ element: node })
  }

  const clientMedia = node.getAttribute('client:media')
  if (clientMedia) {
    await media({ query: clientMedia })
  }

  if (node.hasAttribute('client:idle')) {
    await idle()
  }

  islands[potentialJsPath]()
}
```

with:

```js
const tagName = node.tagName.toLowerCase()
const loader =
  islands[`/frontend/islands/${tagName}.ts`] ??
  islands[`/frontend/islands/${tagName}.js`]
const isPotentialCustomElementName = /-/.test(tagName)

if (isPotentialCustomElementName && loader) {
  if (node.hasAttribute('client:visible')) {
    await visible({ element: node })
  }

  const clientMedia = node.getAttribute('client:media')
  if (clientMedia) {
    await media({ query: clientMedia })
  }

  if (node.hasAttribute('client:idle')) {
    await idle()
  }

  loader()
}
```

- [ ] **Step 3: QA — the site still hydrates**

Run: `npm run dev -- --store <store>` (or `npm run dev` if a store slug is configured). In the browser:

- Open a product page. Confirm the Add-to-cart button works and the cart drawer opens (proves `product-form`, `cart-drawer` still hydrate via the `.js` fallback).
- Open DevTools console. Expected: no `must()` errors, no "undefined is not a function".

**Reset `snippets/vite-tag.liquid` afterward** — `npm run dev` rewrites it to the localhost dev version. Run `git checkout snippets/vite-tag.liquid` before committing so the production output is preserved.

- [ ] **Step 4: Commit**

```bash
git checkout snippets/vite-tag.liquid
git add frontend/lib/revive.js
git commit -m "feat: dual-extension island glob for staged TS migration"
```

### Task 0.6: Enforce typecheck in build/deploy and lint TS

**Files:**

- Modify: `package.json` (scripts)
- Modify: `eslint.config.js`

- [ ] **Step 1: Gate build and deploy on typecheck**

In `package.json` `scripts`, replace:

```json
"build": "vitest run && vite build",
"deploy": "vitest run && npm run build && shopify theme push",
```

with:

```json
"build": "npm run typecheck && vitest run && vite build",
"deploy": "npm run typecheck && vitest run && npm run build && shopify theme push",
```

(`build` runs `typecheck` directly; `deploy` calls `build`, so the check runs once per path — the explicit one in `deploy` guards the `shopify theme push` even if `build` is later reordered. Keeping both is intentional and cheap.)

- [ ] **Step 2: Add typescript-eslint to the flat config**

`eslint.config.js`, replace the file with:

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    ignores: ['assets/']
  }
]
```

- [ ] **Step 3: Verify build gate fires**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json eslint.config.js
git commit -m "build: gate build/deploy on tsc, lint TypeScript"
```

**Phase 0 complete.** The theme is unchanged at runtime, `npm run typecheck` passes, and the migration rails are in place.

---

## Batch 1 — `lib/` conversion (8 source + 4 test files)

**Deliverable:** `frontend/lib/*` is TypeScript at `strict: true`; the cart event bus is a checked contract. Islands still `.js`, still hydrating via the fallback.

**Why first:** islands import from `lib/`; converting it first means every later batch inherits real types. This batch also carries the highest-value type design (the event map) and all the known strict-mode friction (catch narrowing, the `body` annotation).

Convert in dependency order: `utils` → `dom` (done) → `cart-events` → `cart-api` → `cart-live-region` → `a11y` → `sentry` → `revive` → `cart-init`.

**Per-file conversion recipe (apply to each file below):**

1. `git mv frontend/lib/<name>.js frontend/lib/<name>.ts` (and the `.test.js` → `.test.ts` if present).
2. Run `npx tsc --noEmit` and read the errors for that file only.
3. Fix each error using the tools already built: `must()` for required elements, the ambient `window` types, `e instanceof Error` for catch blocks, explicit annotations where inference is too narrow. Do NOT add `any` or `// @ts-ignore` — if stuck, note it and move on to ask.
4. Run the file's tests: `npx vitest run frontend/lib/<name>.test.ts`.
5. `npm run typecheck` clean for the file.
6. Commit per file: `git commit -m "refactor: convert lib/<name> to TypeScript"`.

The two tasks below are the files with non-mechanical type design and are written out in full. The rest (`utils`, `a11y`, `cart-live-region`, `sentry`, `revive`, `cart-init`) follow the recipe; their edits are `must()` swaps and `import type` adjustments discovered from `tsc` output.

### Task 1.1: Convert `cart-events` to a typed event bus

**Files:**

- Rename: `frontend/lib/cart-events.js` → `.ts`
- Rename: `frontend/lib/cart-events.test.js` → `.ts`

**Interfaces:**

- Produces: `CartEventMap` (event name → detail type), and generic
  `dispatchCartEvent<K extends keyof CartEventMap>(name: K, detail: CartEventMap[K]): void`,
  `onCartEvent<K extends keyof CartEventMap>(name: K, cb: (detail: CartEventMap[K]) => void): () => void`.

- [ ] **Step 1: Rename both files**

```bash
git mv frontend/lib/cart-events.js frontend/lib/cart-events.ts
git mv frontend/lib/cart-events.test.js frontend/lib/cart-events.test.ts
```

- [ ] **Step 2: Replace the JSDoc typedefs with real types and generic signatures**

Convert the `@typedef` blocks to exported `interface`s and add a `CartEventMap`. Replace the two function bodies' signatures:

```ts
export interface CartAddDetail {
  variantId: number | string
  quantity?: number
  properties?: Record<string, string>
  sellingPlanId?: number | string
}

export interface CartAddedDetail {
  variantId: number
  quantity: number
  response: unknown
  sections: Record<string, string | null>
}

export interface CartErrorDetail {
  error: string
  action: 'add' | 'update' | 'remove' | 'note-update'
}

export interface CartEventMap {
  add: CartAddDetail
  adding: { variantId: number | string; quantity: number }
  added: CartAddedDetail
  updating: { line: string | number; quantity: number }
  updated: {
    line: string | number
    cart: unknown
    sections: Record<string, string | null>
  }
  removing: { line: string | number }
  removed: {
    line: string | number
    cart: unknown
    sections: Record<string, string | null>
  }
  'note-updated': { note: string; cart: unknown }
  error: CartErrorDetail
}

export function dispatchCartEvent<K extends keyof CartEventMap>(
  name: K,
  detail: CartEventMap[K]
): void {
  document.dispatchEvent(
    new CustomEvent(`cart:${name}`, { detail, bubbles: true })
  )
}

export function onCartEvent<K extends keyof CartEventMap>(
  name: K,
  callback: (detail: CartEventMap[K]) => void
): () => void {
  const handler = (event: Event) =>
    callback((event as CustomEvent<CartEventMap[K]>).detail)
  document.addEventListener(`cart:${name}`, handler)
  return () => document.removeEventListener(`cart:${name}`, handler)
}
```

Note: the `error` action union gains `'note-update'` — `cart-api` already dispatches that value, so the old JSDoc union was wrong. This is a correctness fix, not a widening for convenience.

- [ ] **Step 3: Fix the test types**

In `cart-events.test.ts`, change `import { ... } from './cart-events.js'` to `from './cart-events'`. If any test dispatches an event name or detail that no longer matches `CartEventMap`, the compiler will flag it — fix the test to use a valid shape (that mismatch is the checker catching a stale test).

- [ ] **Step 4: Typecheck + test**

Run: `npm run typecheck && npx vitest run frontend/lib/cart-events.test.ts`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/cart-events.ts frontend/lib/cart-events.test.ts
git commit -m "refactor: convert cart-events to a typed event bus"
```

### Task 1.2: Convert `cart-api` (catch narrowing + body annotation)

**Files:**

- Rename: `frontend/lib/cart-api.js` → `.ts`
- Rename: `frontend/lib/cart-api.test.js` → `.ts`

**Interfaces:**

- Consumes: `CartEventMap`, `CartAddDetail` from `cart-events`; `fetchConfig` from `utils`; `CartDrawerElement` (ambient) via `document.querySelector('cart-drawer')`.
- Produces: `addToCart`, `updateCartItem`, `updateCartNote` with typed params.

- [ ] **Step 1: Rename both files**

```bash
git mv frontend/lib/cart-api.js frontend/lib/cart-api.ts
git mv frontend/lib/cart-api.test.js frontend/lib/cart-api.test.ts
```

- [ ] **Step 2: Annotate the request body so conditional assignment type-checks**

The `const body = {...}` in `addToCart` is inferred too narrowly, so `body.properties = ...` and `body.selling_plan = ...` are rejected. Give it an explicit type:

```ts
interface CartAddRequestBody {
  id: number
  quantity: number
  sections: string[]
  sections_url: string
  properties?: Record<string, string>
  selling_plan?: number
}

const body: CartAddRequestBody = {
  id: Number(variantId),
  quantity,
  sections: getSectionsToRender(),
  sections_url: window.location.pathname
}
```

- [ ] **Step 3: Narrow catch variables**

`strict` makes `catch (e)` give `e: unknown`. In each of the three `catch` blocks, replace `error: e.message` with a narrowed read:

```ts
} catch (e) {
  dispatchCartEvent('error', {
    error: e instanceof Error ? e.message : String(e),
    action: 'add' // (or the block's action)
  })
}
```

- [ ] **Step 4: Type `getSectionsToRender` return and the parseInt call**

`getSectionsToRender` returns `string[]`. `document.querySelector('cart-drawer')` now returns `CartDrawerElement | null` via the ambient map, so `cartDrawer.getSectionsToRender()` type-checks after a null guard (already present). Ensure the `.map((section) => section.id)` stays.

- [ ] **Step 5: Fix the test**

`cart-api.test.ts`: change the import extension; the mock calls to `updateCartItem({ line, quantity })` missing `sections` will be flagged — add `sections: []` to those calls (the real signature requires it, so the test was under-specifying).

- [ ] **Step 6: Typecheck + test**

Run: `npm run typecheck && npx vitest run frontend/lib/cart-api.test.ts`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/cart-api.ts frontend/lib/cart-api.test.ts
git commit -m "refactor: convert cart-api to TypeScript"
```

### Task 1.3: Convert remaining `lib/` files via the recipe

Apply the per-file recipe (above) to, in order: `utils` (+`utils.test`), `a11y`, `cart-live-region` (+`cart-live-region.test`), `sentry`, `revive`, `cart-init`. Each is one commit.

- [ ] `utils` + `utils.test` — trivial; `debounce` needs a generic signature `<A extends unknown[]>(fn: (...a: A) => void, wait: number)`.
- [ ] `a11y` — `getFocusableElements`/`trapFocus` need `HTMLElement` params and `must()`/casts for the ~22 element accesses.
- [ ] `cart-live-region` + test — uses `announce`/`initCartAnnouncements`; `must()` for the live-region element.
- [ ] `sentry` — mostly annotation; `@sentry/browser` types come from the package (`skipLibCheck` covers its internals).
- [ ] `revive` — now becomes `revive.ts`. The dual-extension lookup already added in Phase 0 stays. Type `node` params as `Element`, `dfs(node: Element)`, and the exported `islands` as `Record<string, () => Promise<unknown>>`.
- [ ] `cart-init` — imports only; extensions resolve automatically. Likely zero edits beyond rename.

- [ ] **After the last file: full suite + QA**

Run: `npm run typecheck && npx vitest run`
Expected: all pass.

QA: `npm run dev`, exercise add-to-cart, cart drawer open/close, quantity change, cart note. Confirm accessibility announcements still fire (inspect the live region). Reset `snippets/vite-tag.liquid` after.

---

## Batches 2–4 — Island conversion

**Deliverable per batch:** the batch's islands are `.ts` at `strict`; each hydrates and behaves in a live QA pass.

Islands are mechanical conversions — the exact edits are whatever `tsc` reports for each file, fixed with the same tools (`must()`, ambient `window` types, `instanceof` narrowing, `HTMLInputElement`/`HTMLButtonElement` casts for `.value`/`.disabled` access). Convert one island per commit using the **per-file recipe** from Batch 1. Do NOT batch-rename; a bad rename that desyncs the glob kills hydration silently, so convert-test-commit one at a time.

**Batch 2 — cart (5):** `cart-drawer`, `cart-drawer-items`, `cart-items`, `cart-note`, `cart-remove-button`.

- [ ] When converting `cart-drawer`, replace the ambient `CartDrawerElement` interface in `globals.d.ts` with the real class: change the `HTMLElementTagNameMap` entry to `'cart-drawer': CartDrawer` and `export`/type the class so it structurally provides `getSectionsToRender()`. Run `npm run typecheck` to confirm `cart-api` still resolves the method.
- [ ] `cart-items` had the most errors in the probe (dataset access, `setAttribute` boolean coercions) — expect the most edits here.

**Batch 3 — product (6):** `product-form`, `variant-radios`, `variant-selects`, `selling-plan-picker`, `quantity-input`, `product-recommendations`.

Task 3.x below (product-form) is written out in full because it fixes a known live bug. The rest follow the recipe.

**Batch 4 — UI/chrome (8):** `header-drawer`, `sticky-header`, `details-modal`, `details-disclosure`, `password-modal`, `localization-form`, `video-player`, `newsletter-form`.

- [ ] **End of each batch: QA pass** — `npm run dev`, load a page per island, confirm hydration + behavior, reset `vite-tag.liquid`.

### Task 3.x: Convert `product-form` AND fix the double-submit bug

**Files:**

- Rename: `frontend/islands/product-form.js` → `.ts`
- Create: `frontend/islands/product-form.test.ts`

**Bug:** `frontend/islands/product-form.js:46` reads `getAttribute('aria-disabled') === true`. `getAttribute` returns `string | null`, so the comparison is always false and the double-submit guard never fires — a fast double-click adds the item to cart twice. The attribute is written as the string `"true"` (via `setAttribute('aria-disabled', true)` on line 49, which the DOM stringifies), so the correct comparison is `=== 'true'`.

- [ ] **Step 1: Write the failing regression test (behavior, pre-conversion)**

`frontend/islands/product-form.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onCartEvent } from '@/lib/cart-events'
import './product-form'

function mountForm() {
  document.body.innerHTML = `
    <product-form>
      <form id="product-form-1" data-type="add-to-cart-form">
        <input type="hidden" name="id" value="42" disabled>
        <input type="hidden" name="quantity" value="1">
        <button type="submit" name="add"><span>Add</span></button>
        <div data-error-message hidden></div>
      </form>
    </product-form>`
  return document.querySelector('form') as HTMLFormElement
}

describe('product-form double-submit guard', () => {
  beforeEach(() => {
    window.routes = {
      cart_add_url: '',
      cart_change_url: '',
      cart_update_url: '',
      cart_url: ''
    }
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dispatches cart:add only once for a double submit', () => {
    const form = mountForm()
    const adds = vi.fn()
    onCartEvent('add', adds)

    form.requestSubmit()
    form.requestSubmit() // second submit while the first is pending

    expect(adds).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it — expect failure (two dispatches)**

Run: `npx vitest run frontend/islands/product-form.test.ts`
Expected: FAIL — `expected 1, received 2` (the broken guard lets both through).

- [ ] **Step 3: Rename to `.ts` and fix the guard**

```bash
git mv frontend/islands/product-form.js frontend/islands/product-form.ts
```

At line 46 (now in `.ts`), replace:

```ts
if (this.submitButton.getAttribute('aria-disabled') === true) return
```

with:

```ts
if (this.submitButton.getAttribute('aria-disabled') === 'true') return
```

- [ ] **Step 4: Resolve the strict-mode errors from the rename**

`tsc` will flag: class fields need declared types (`form!: HTMLFormElement`, `submitButton!: HTMLButtonElement`, `pending = false`, `errorMessage?: HTMLElement`), `this.querySelector('form')` returns `HTMLFormElement | null` (use `must(this, 'form')`), `formData.get('quantity')` is `FormDataEntryValue | null` (guard/`String()` before `parseInt`), and `setAttribute('aria-disabled', true)` → `'true'`. Apply them.

- [ ] **Step 5: Run test + typecheck — expect pass**

Run: `npm run typecheck && npx vitest run frontend/islands/product-form.test.ts`
Expected: both pass (guard now dispatches once).

- [ ] **Step 6: QA the real interaction**

`npm run dev`, open a product page, double-click Add-to-cart fast, confirm the cart shows quantity 1, not 2. Reset `vite-tag.liquid`.

- [ ] **Step 7: Commit**

```bash
git checkout snippets/vite-tag.liquid
git add frontend/islands/product-form.ts frontend/islands/product-form.test.ts
git commit -m "fix: product-form double-submit guard (aria-disabled string compare)

Convert to TypeScript; getAttribute returns string|null so the ===true
guard never fired and a double-click added to cart twice. Compare ==='true'."
```

---

## Phase 5 — Remove the migration scaffolding

**Deliverable:** no `.js` remains in `frontend/`; the dual-extension glob and `allowJs` are gone. This phase is what prevents the transitional state from becoming permanent.

**Precondition:** every file under `frontend/` is `.ts`. Verify: `find frontend -name '*.js' | grep -v node_modules` returns nothing.

### Task 5.1: Narrow the glob and rename the entrypoint

**Files:**

- Modify: `frontend/lib/revive.ts` (glob + lookup)
- Rename: `frontend/entrypoints/theme.js` → `theme.ts`
- Modify: `layout/theme.liquid:70`, `layout/password.liquid:56`, `templates/gift_card.liquid:65`

- [ ] **Step 1: Narrow the glob to `.ts` only**

In `revive.ts`, change the glob back to single-extension and restore the single-path lookup:

```ts
export const islands = import.meta.glob('@/islands/*.ts')
```

and

```ts
const loader = islands[`/frontend/islands/${tagName}.ts`]
```

- [ ] **Step 2: Rename the entrypoint**

```bash
git mv frontend/entrypoints/theme.js frontend/entrypoints/theme.ts
```

- [ ] **Step 3: Update the Liquid references**

`layout/theme.liquid:70`, `layout/password.liquid:56`, `templates/gift_card.liquid:65`: change `render 'vite-tag' with 'theme.js'` → `render 'vite-tag' with 'theme.ts'` (and the css line stays `theme.css`). Grep to be sure none are missed: `grep -rn "with 'theme.js'" layout templates snippets`.

- [ ] **Step 4: Rebuild to regenerate `vite-tag.liquid`**

Run: `npm run build`
Expected: `typecheck` passes, `vite build` regenerates `snippets/vite-tag.liquid` referencing the `theme.[hash].min.js` built from `theme.ts`. Confirm the generated snippet points at a hashed asset, not localhost.

- [ ] **Step 5: QA production build**

`npm run dev`, full smoke test (product page, cart, drawer, header, localization). Confirm every island hydrates now that the `.js` fallback is gone.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/revive.ts frontend/entrypoints/theme.ts layout/theme.liquid layout/password.liquid templates/gift_card.liquid snippets/vite-tag.liquid
git commit -m "refactor: narrow island glob to .ts, rename entrypoint"
```

### Task 5.2: Disallow JS

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Turn off `allowJs`**

In `tsconfig.json`, set `"allowJs": false` and remove `"checkJs": false` (moot now). Remove `vite.config.js`/`vitest.config.js` from `include` only if they are converted; otherwise keep them (config files may stay `.js`).

- [ ] **Step 2: Typecheck + full suite**

Run: `npm run typecheck && npx vitest run`
Expected: both pass with zero `.js` in `frontend/`.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "build: disallow JS now that migration is complete"
```

**Migration complete.**

---

## Self-Review Notes

- **Spec coverage:** Phase 0 (tsconfig, globals.d.ts, must(), dual glob, tsc enforcement, eslint) → Tasks 0.1–0.6. Batch 1 `lib/` incl. event map + cart types + catch narrowing + body annotation → Tasks 1.1–1.3. Batches 2–4 islands → recipe + Task 3.x. product-form bug → Task 3.x. Phase 5 scaffolding removal incl. the third extension-coupling site (`layout` Liquid) → Tasks 5.1–5.2. All spec sections mapped.
- **Known deviation from spec:** spec described `revive.ts` under Phase 0; this plan edits `revive.js` in place in Phase 0 (rename-free, lower risk) and renames it to `.ts` in Batch 1. Documented in Task 0.5 / Task 1.3.
- **Island batch code:** deliberately given as a repeatable recipe rather than fabricated per-file code, because exact edits are `tsc`-driven and the 19 island files were not read line-by-line. The one island with concrete known work (product-form bug) is written in full.
- **Type consistency:** `must()`, `CartEventMap`, `CartDrawerElement`→`CartDrawer`, `CartAddRequestBody` names are used consistently across tasks. `CartDrawerElement` is intentionally a Phase-0 placeholder replaced by the real class in Batch 2 (flagged in that task).
