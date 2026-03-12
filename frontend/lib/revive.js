/**
 * Island Hydration Engine
 *
 * Lazily hydrates Web Component islands using Astro-style client directives.
 * On page load, walks the DOM to discover custom elements that have a
 * matching module in `frontend/islands/`. A `MutationObserver` watches for
 * dynamically added nodes so late-injected islands are also hydrated.
 *
 * Directives (evaluated in order on each element):
 * - `client:visible` — defers import until the element enters the viewport (IntersectionObserver)
 * - `client:media="(query)"` — defers import until the media query matches
 * - `client:idle` — defers import until the main thread is idle (requestIdleCallback, 200 ms fallback)
 *
 * If no directive is present the module is imported immediately.
 */

/**
 * Resolves when the given media query matches.
 * @param {object} options
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
 * @param {object} options
 * @param {Element} options.element - DOM element to observe
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
 * Resolves when the main thread is idle.
 * Falls back to a 200 ms timeout when `requestIdleCallback` is unavailable.
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
 * Eager glob of all island modules.
 * Keys are paths like `/frontend/islands/product-form.js`; values are
 * dynamic import functions (`() => Promise<Module>`).
 * @type {Record<string, () => Promise<Module>>}
 */
export const islands = import.meta.glob('@/islands/*.js')

/**
 * Boots the hydration engine.
 *
 * Performs an initial depth-first walk of `document.body`, then installs a
 * `MutationObserver` to hydrate any islands added after initial load.
 *
 * @param {Record<string, () => Promise<Module>>} islands - Glob map from `import.meta.glob`
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
