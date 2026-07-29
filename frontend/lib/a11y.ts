/**
 * @file Accessibility helpers for focus management and disclosure widgets.
 */

/**
 * Returns all visible, focusable elements within a container.
 * Uses a broad selector covering interactive elements: summary, anchors,
 * enabled buttons/inputs/selects/textareas, tabbable elements, draggables,
 * areas, objects, and iframes. Filters out elements with zero dimensions.
 * @param container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(
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
 */
const trapFocusHandlers: {
  focusin?: EventListener
  focusout?: EventListener
  keydown?: EventListener
} = {}

/**
 * Trap keyboard focus within a container. Tab and Shift+Tab wrap between the
 * first and last focusable elements. Any previous trap is removed first.
 * @param container - Element whose focusable children form the trap
 * @param elementToFocus - Element to focus immediately
 */
export function trapFocus(
  container: HTMLElement,
  elementToFocus: HTMLElement = container
) {
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

    if (trapFocusHandlers.keydown) {
      document.addEventListener('keydown', trapFocusHandlers.keydown)
    }
  }

  trapFocusHandlers.focusout = function () {
    if (trapFocusHandlers.keydown) {
      document.removeEventListener('keydown', trapFocusHandlers.keydown)
    }
  }

  trapFocusHandlers.keydown = function (event) {
    if (!(event instanceof KeyboardEvent)) return
    if (event.code.toUpperCase() !== 'TAB') return // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault()
      first?.focus()
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault()
      last?.focus()
    }
  }

  document.addEventListener('focusout', trapFocusHandlers.focusout)
  document.addEventListener('focusin', trapFocusHandlers.focusin)

  elementToFocus.focus()
}

/**
 * Remove the active focus trap and optionally return focus to an element.
 * @param elementToFocus - Element to focus after removal
 */
export function removeTrapFocus(elementToFocus: HTMLElement | null = null) {
  if (trapFocusHandlers.focusin) {
    document.removeEventListener('focusin', trapFocusHandlers.focusin)
  }
  if (trapFocusHandlers.focusout) {
    document.removeEventListener('focusout', trapFocusHandlers.focusout)
  }
  if (trapFocusHandlers.keydown) {
    document.removeEventListener('keydown', trapFocusHandlers.keydown)
  }

  if (elementToFocus) elementToFocus.focus()
}

/**
 * Keyup handler that closes the nearest open `<details>` on Escape.
 * Updates `aria-expanded` and returns focus to the `<summary>`.
 * @param event
 */
export function onKeyUpEscape(event: KeyboardEvent) {
  if (event.code.toUpperCase() !== 'ESCAPE') return

  const target = event.target as HTMLElement
  const openDetailsElement = target.closest('details[open]')
  if (!openDetailsElement) return

  const summaryElement = openDetailsElement.querySelector('summary')
  openDetailsElement.removeAttribute('open')
  summaryElement?.setAttribute('aria-expanded', 'false')
  summaryElement?.focus()
}

/**
 * Enhance `<summary>` elements with ARIA disclosure semantics.
 * Sets `role="button"`, syncs `aria-expanded`, adds `aria-controls` when
 * the sibling content has an `id`, and registers Escape-to-close.
 * @param summaries - `<summary>` elements to enhance
 */
export function initDisclosureWidgets(summaries: NodeListOf<HTMLElement>) {
  summaries.forEach((summary) => {
    summary.setAttribute('role', 'button')
    summary.setAttribute(
      'aria-expanded',
      String(
        summary.parentNode instanceof Element &&
          summary.parentNode.hasAttribute('open')
      )
    )

    const nextSibling = summary.nextElementSibling
    if (nextSibling?.getAttribute('id')) {
      summary.setAttribute('aria-controls', nextSibling.id)
    }

    summary.addEventListener('click', (event) => {
      const currentTarget = event.currentTarget as HTMLElement
      currentTarget.setAttribute(
        'aria-expanded',
        String(!currentTarget.closest('details')?.hasAttribute('open'))
      )
    })

    summary.parentElement?.addEventListener('keyup', (event) =>
      onKeyUpEscape(event as KeyboardEvent)
    )
  })
}
