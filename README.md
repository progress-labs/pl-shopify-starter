# Hydrogen Theme

[![Build status](https://github.com/montalvomiguelo/hydrogen-theme/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/montalvomiguelo/hydrogen-theme/actions/workflows/ci.yml?query=branch%3Amain)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/montalvomiguelo/hydrogen-theme/blob/main/LICENSE.md)

A port of Hydrogen's default template to Shopify OS 2.0.

![pika-1697163139924-1x](https://github.com/montalvomiguelo/hydrogen-theme/assets/5134470/d92f6135-62d8-4a7d-a612-c812c6652da1)

## 🔨 Requirements

- [Node.js (latest LTS version)](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/) (included with Node.js)
- [Shopify CLI](https://shopify.dev/themes/tools/cli)

## 🚀 Project Structure

This theme leverages the [default Shopify theme folder structure](https://shopify.dev/themes/tools/github#repository-structure) and introduces the following directories, some of which have special behaviors.

```bash
└── hydrogen-theme
    └── frontend
        ├── entrypoints
        ├── islands
        ├── lib
        └── styles
```

| Subdirectory  | Description                           |
| :------------ | :------------------------------------ |
| `entrypoints` | The entry points for your theme       |
| `islands`     | The interactive islands in your theme |
| `lib`         | Theme specific libraries              |
| `styles`      | The styles of your theme              |

## 🧞 Commands

| Command          | Action                                                                            |
| :--------------- | :-------------------------------------------------------------------------------- |
| `npm install`    | Installs dependencies                                                             |
| `npm run dev`    | Launch the Shopify and Vite servers in parallel (store from `shopify.theme.toml`) |
| `npm run build`  | Typecheck, test, and bundle assets                                                |
| `npm run deploy` | Lint, build, and push to Shopify (`development` environment, `--nodelete`)        |

## 🏝️ Hydration Directives

The following hydration strategies are available (borrowed from [Astro](https://docs.astro.build/en/concepts/islands/)).

| Directive        | Description                                                                                                                                       |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client:idle`    | Hydrate the component as soon as the main thread is [free](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)           |
| `client:visible` | Hydrates the component as soon as the element [enters the viewport](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)   |
| `client:media`   | Hydrates the component as soon as the browser [matches the given media query](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) |

Usage:

```html
<my-component client:visible>This is an island.</my-component>
```

## 🗺️ Audit Roadmap

A full theme audit (2026-08) was implemented across PRs #17–#21. Completed work is collapsed below; open tasks follow. Finding-level detail lives in the PR bodies and commit messages.

<details>
<summary><strong>✅ Completed (merged to main)</strong></summary>

### Liquid & SEO (#17/#18)

- [x] Pagination on collection, search, blog, and list-collections pages
- [x] Variant JSON trimmed to the fields the JS reads; AggregateOffer JSON-LD
- [x] Cart line-item/summary snippets deduped via `render ... for` (~300 lines)
- [x] Responsive image `sizes`/`fetchpriority` threaded through all call sites; og:image and poster caps; media-gallery `widths` fix
- [x] Preconnects to `cdn.shopify.com` / `fonts.shopifycdn.com`
- [x] JSON-LD URL fixes, header logo setting, blank `sameAs` dropped
- [x] `enabled_on` + missing schemas across sections; template JSON cleanup
- [x] Star icon sprites; shared spinner; malformed SVGs closed
- [x] `routes.cart_url` global (add-to-cart 404 without drawer); `theme-global-object` restored as the single home for JS globals
- [x] PDP price updates on variant switch (`[data-product-price]` hook + `use_variant` block setting)

### Frontend correctness (#19)

- [x] Sentry as its own deferred chunk, initialized on every page (`product-recommendations` island: 219 KB → 679 B); buffered `captureException` facade; hidden sourcemaps
- [x] Hydration engine: discovery decoupled from directives; `client:idle` timeout; `client:visible` rootMargin; chunk-load retry + reporting
- [x] Cart: per-operation `AbortController` dedup; localized non-JSON error handling; per-variant element ids (no drawer/page cross-binding); non-throwing error path; failed add re-enables button
- [x] `variant-selects`: fetch abort + per-variant cache
- [x] Island lifecycle: `disconnectedCallback` cleanup for all leaking islands; passive scroll listener

### Tooling & guardrails (#20)

- [x] CSS token fix (`.strike`, `--shadow-border`, gift-card theming)
- [x] Deploy hardened: `-e development --nodelete`; dev via `concurrently --kill-others`
- [x] CI `verify` job (npm ci, typecheck, vitest, lint, format-check, build) + stale-asset manifest guard
- [x] Theme Check blocking at `--fail-level error`
- [x] `eslint-config-prettier` wired; `chunkSizeWarningLimit`

### Modern platform (#21)

- [x] Speculation Rules: prerender PDPs / prefetch collections on link intent
- [x] View Transitions on cart re-renders (reduced-motion aware)
- [x] `content-visibility: auto` on below-fold sections
- [x] `prefers-reduced-motion` respected globally
- [x] Island `modulepreload` (build-generated snippet, inert in dev) + hover/focus intent prefetch

</details>

### Open tasks

**Waiting on a decision/credentials**

- [ ] Lighthouse CI — add `SHOP_ACCESS_TOKEN`/`SHOP_STORE`/`SHOP_PASSWORD`/`LHCI_GITHUB_APP_TOKEN` secrets, uncomment the job in `ci.yml`, add a `budget.json`
- [ ] Sentry sourcemap upload — wire `@sentry/vite-plugin` with org/project/auth token
- [ ] Decide: gitignore built assets (CI stale-asset guard covers the failure mode meanwhile)
- [ ] Preview & decide: cross-document View Transitions (`@view-transition { navigation: auto }`)

**Own project**

- [ ] Native `<dialog>` migration for cart drawer / header drawer / password modal — deletes ~110 lines of focus-trap code, fixes nested traps structurally; needs animation re-plumbing + manual a11y pass

**Backlog**

- [ ] Tests for the riskiest code (recommended next): `revive.ts`, `cart-items.ts`, `a11y.ts`, leak regressions, dead-island guard, vitest coverage threshold
- [ ] Icon migration: `snippets/icon-*.liquid` → `assets/*.svg` + `inline_asset_content` (visual-regression-prone; preview open)
- [ ] Consolidate `hero-banner` into `image-banner` (check template references first)
- [ ] Small fry: replace `klaviyo-subscribe` with a plain `fetch`; bump `theme_version` on releases; fill placeholder URLs in `settings_schema.json`; move/delete root demo HTML files; `initDisclosureWidgets` modernization; newsletter-form error path

**Accepted trade-offs (documented, not planned)**

- Section Rendering API fetches a whole section per variant/cart update — kept for single-source-of-truth rendering; revisit only if cart latency matters on a real store
- Theme Check's parser is more lenient than the storefront parser — green check ≠ renders; CI build + preview testing cover the gap
- `ValidContentForArguments` disabled — the block architecture passes custom `content_for 'block'` params the runtime supports

## 🙇‍♂️ Thanks

We would like to specifically thank the following projects for the inspiration and help regarding the creation of hydrogen-theme:

- [vite-plugin-shopify](https://github.com/barrel/shopify-vite)
- [hydrogen](https://github.com/Shopify/hydrogen)
- [dawn](https://github.com/Shopify/dawn)
- [astro](https://github.com/withastro/astro)
