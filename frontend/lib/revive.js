/**
 * @file Island hydration engine for lazy-loading Web Components.
 *
 * Walks the DOM (and watches for mutations) to discover custom elements that
 * have a corresponding module in `frontend/islands/`. Hydration is deferred
 * based on Astro-style client directives:
 *
 * - `client:visible` — hydrate when the element enters the viewport (IntersectionObserver)
 * - `client:media="(query)"` — hydrate when the media query matches
 * - `client:idle` — hydrate when the main thread is idle (requestIdleCallback)
 *
 * If no directive is present the island hydrates immediately on discovery.
 */

/**
 * Resolves when the given media query matches.
 * @param {Object} options
 * @param {string} options.query - CSS media query string
 * @returns {Promise<boolean>}
 */
function media({ query }) {
  const mediaQuery = window.matchMedia(query)
  return new Promise(function (resolve) {
    if (mediaQuery.matches) {
      resolve(true)
    } else {
      mediaQuery.addEventListener('change', resolve, { once: true })
    }
  })
}

/**
 * Resolves when the element enters the viewport.
 * @param {Object} options
 * @param {HTMLElement} options.element - Element to observe
 * @returns {Promise<boolean>}
 */
function visible({ element }) {
  return new Promise(function (resolve) {
    const observer = new window.IntersectionObserver(async function (entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.disconnect()
          resolve(true)
          break
        }
      }
    })
    observer.observe(element)
  })
}

/**
 * Resolves when the main thread is idle. Falls back to a 200ms timeout
 * if `requestIdleCallback` is unavailable.
 * @returns {Promise<void>}
 */
function idle() {
  return new Promise(function (resolve) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(resolve)
    } else {
      setTimeout(resolve, 200)
    }
  })
}

/**
 * Eagerly resolved map of island modules produced by Vite's `import.meta.glob`.
 * Keys are paths like `/frontend/islands/product-form.js`; values are
 * dynamic import functions `() => Promise<Module>`.
 * @type {Record<string, () => Promise<Record<string, any>>>}
 */
export const islands = import.meta.glob('@/islands/*.js')

/**
 * Bootstrap island hydration. Performs a depth-first walk of `document.body`
 * to hydrate existing islands, then installs a `MutationObserver` to hydrate
 * any islands added later (e.g. via section rendering).
 *
 * @param {Record<string, () => Promise<Record<string, any>>>} islands
 *   Module map from `import.meta.glob` — keys are `/frontend/islands/<tag>.js` paths.
 */
export function revive(islands) {
  const observer = new window.MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const { addedNodes } = mutations[i]
      for (let j = 0; j < addedNodes.length; j++) {
        const node = addedNodes[j]
        if (node.nodeType === 1) dfs(node)
      }
    }
  })

  async function dfs(node) {
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

    let child = node.firstElementChild

    while (child) {
      dfs(child)
      child = child.nextElementSibling
    }
  }

  dfs(document.body)

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}
