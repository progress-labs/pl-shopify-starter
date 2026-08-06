/**
 * @file Island hydration engine for lazy-loading Web Components.
 *
 * Walks the DOM (and watches for mutations) to discover custom elements that
 * have a corresponding module in `frontend/islands/`. Hydration is deferred
 * based on Astro-style client directives:
 *
 * - `client:visible` — hydrate when the element nears the viewport (IntersectionObserver)
 * - `client:media="(query)"` — hydrate when the media query matches
 * - `client:idle` — hydrate when the main thread is idle (requestIdleCallback)
 *
 * If no directive is present the island hydrates immediately on discovery.
 *
 * Discovery is synchronous and independent of hydration: a parent island
 * awaiting its directive never blocks discovery of islands inside it (e.g. a
 * `client:media` header drawer that doesn't match on desktop must not hide
 * the islands it contains from the scanner).
 */
import { captureException } from '@/lib/error-tracking'

/** How long `client:idle` may be starved before hydrating anyway. Third-party
 *  scripts can keep the main thread busy indefinitely, and idle islands
 *  include the Add-to-Cart form. */
const IDLE_TIMEOUT_MS = 1500

/** Hydrate `client:visible` islands this far before they enter the viewport,
 *  so module fetch + upgrade happen off-screen instead of in front of the
 *  shopper. */
const VISIBLE_ROOT_MARGIN = '200px 0px'

/**
 * Resolves when the given media query matches.
 * @param options
 * @param options.query - CSS media query string
 */
function media({ query }: { query: string }): Promise<boolean> {
  const mediaQuery = window.matchMedia(query)
  return new Promise(function (resolve) {
    if (mediaQuery.matches) {
      resolve(true)
      return
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        mediaQuery.removeEventListener('change', onChange)
        resolve(true)
      }
    }
    mediaQuery.addEventListener('change', onChange)
  })
}

/**
 * Resolves when the element nears the viewport.
 * @param options
 * @param options.element - Element to observe
 */
function visible({ element }: { element: Element }): Promise<boolean> {
  return new Promise(function (resolve) {
    const observer = new window.IntersectionObserver(
      function (entries) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect()
            resolve(true)
            break
          }
        }
      },
      { rootMargin: VISIBLE_ROOT_MARGIN }
    )
    observer.observe(element)
  })
}

/**
 * Resolves when the main thread is idle, or after {@link IDLE_TIMEOUT_MS}
 * if idle never comes. Falls back to a 200ms timeout if
 * `requestIdleCallback` is unavailable.
 */
function idle(): Promise<void> {
  return new Promise(function (resolve) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS })
    } else {
      setTimeout(resolve, 200)
    }
  })
}

/**
 * Eagerly resolved map of island modules produced by Vite's `import.meta.glob`.
 * Keys are paths like `/frontend/islands/product-form.ts`; values are
 * dynamic import functions `() => Promise<Module>`. `*.test.ts` files are
 * excluded so regression tests aren't bundled and shipped to production.
 */
export const islands: Record<string, () => Promise<unknown>> = import.meta.glob(
  ['@/islands/*.ts', '!@/islands/*.test.ts']
)

/**
 * Bootstrap island hydration. Installs a `MutationObserver` first (so nodes
 * inserted mid-walk are never missed), then synchronously walks
 * `document.body` scheduling hydration for every discovered island.
 *
 * @param islands
 *   Module map from `import.meta.glob` — keys are island module paths whose
 *   basename is the custom element tag name.
 */
export function revive(islands: Record<string, () => Promise<unknown>>) {
  // Key by tag name ('product-form') instead of rebuilding a path string per
  // DOM node — and so the module directory can move without silently
  // breaking hydration.
  const registry = new Map<string, () => Promise<unknown>>(
    Object.entries(islands).map(([path, loader]) => [
      path.slice(path.lastIndexOf('/') + 1).replace(/\.ts$/, ''),
      loader
    ])
  )

  const scheduled = new WeakSet<Element>()

  async function hydrate(node: Element, loader: () => Promise<unknown>) {
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

    try {
      await loader()
    } catch {
      // One retry for transient failures (flaky network, deploy mid-session);
      // then report — a failed chunk load is otherwise an invisibly dead
      // island.
      try {
        await loader()
      } catch (error) {
        captureException(error, {
          tags: { island: node.tagName.toLowerCase() }
        })
      }
    }
  }

  function walk(root: Element) {
    const tagName = root.tagName.toLowerCase()
    if (tagName.includes('-') && !scheduled.has(root)) {
      const loader = registry.get(tagName)
      if (loader) {
        scheduled.add(root)
        void hydrate(root, loader)
      }
    }

    for (
      let child = root.firstElementChild;
      child;
      child = child.nextElementSibling
    ) {
      walk(child)
    }
  }

  const observer = new window.MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) walk(node as Element)
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  walk(document.body)
}
