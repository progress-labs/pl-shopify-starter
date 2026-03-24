/**
 * @file Accessibility helpers for focus management and disclosure widgets.
 */

/**
 * Returns all visible, focusable elements within a container.
 * Uses a broad selector covering interactive elements: summary, anchors,
 * enabled buttons/inputs/selects/textareas, tabbable elements, draggables,
 * areas, objects, and iframes. Filters out elements with zero dimensions.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
  const elements = Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  )

  // Filter out elements that are not visible.
  // Copied from jQuery https://github.com/jquery/jquery/blob/2d4f53416e5f74fa98e0c1d66b6f3c285a12f0ce/src/css/hiddenVisibleSelectors.js
  return elements.filter(
    (element) =>
      !!(
        element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
      )
  )
}

/**
 * Shared handler map for the active focus trap. Stores `focusin`, `focusout`,
 * and `keydown` listeners so they can be removed by `removeTrapFocus`.
 * @type {{ focusin?: EventListener, focusout?: EventListener, keydown?: EventListener }}
 */
const trapFocusHandlers = {}

/**
 * Trap keyboard focus within a container. Tab and Shift+Tab wrap between the
 * first and last focusable elements. Any previous trap is removed first.
 * @param {HTMLElement} container - Element whose focusable children form the trap
 * @param {HTMLElement} [elementToFocus=container] - Element to focus immediately
 */
export function trapFocus(container, elementToFocus = container) {
  const elements = getFocusableElements(container)
  const first = elements[0]
  const last = elements[elements.length - 1]

  removeTrapFocus()

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    ) {
      return
    }

    document.addEventListener('keydown', trapFocusHandlers.keydown)
  }

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown)
  }

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault()
      first.focus()
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault()
      last.focus()
    }
  }

  document.addEventListener('focusout', trapFocusHandlers.focusout)
  document.addEventListener('focusin', trapFocusHandlers.focusin)

  elementToFocus.focus()
}

/**
 * Remove the active focus trap and optionally return focus to an element.
 * @param {HTMLElement | null} [elementToFocus=null] - Element to focus after removal
 */
export function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin)
  document.removeEventListener('focusout', trapFocusHandlers.focusout)
  document.removeEventListener('keydown', trapFocusHandlers.keydown)

  if (elementToFocus) elementToFocus.focus()
}

/**
 * Keyup handler that closes the nearest open `<details>` on Escape.
 * Updates `aria-expanded` and returns focus to the `<summary>`.
 * @param {KeyboardEvent} event
 */
export function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return

  const openDetailsElement = event.target.closest('details[open]')
  if (!openDetailsElement) return

  const summaryElement = openDetailsElement.querySelector('summary')
  openDetailsElement.removeAttribute('open')
  summaryElement.setAttribute('aria-expanded', false)
  summaryElement.focus()
}

/**
 * Enhance `<summary>` elements with ARIA disclosure semantics.
 * Sets `role="button"`, syncs `aria-expanded`, adds `aria-controls` when
 * the sibling content has an `id`, and registers Escape-to-close.
 * @param {NodeListOf<HTMLElement>} summaries - `<summary>` elements to enhance
 */
export function initDisclosureWidgets(summaries) {
  summaries.forEach((summary) => {
    summary.setAttribute('role', 'button')
    summary.setAttribute(
      'aria-expanded',
      summary.parentNode.hasAttribute('open')
    )

    if (summary.nextElementSibling.getAttribute('id')) {
      summary.setAttribute('aria-controls', summary.nextElementSibling.id)
    }

    summary.addEventListener('click', (event) => {
      event.currentTarget.setAttribute(
        'aria-expanded',
        !event.currentTarget.closest('details').hasAttribute('open')
      )
    })

    summary.parentElement.addEventListener('keyup', onKeyUpEscape)
  })
}
