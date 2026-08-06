/**
 * @file Progressive View Transitions wrapper.
 *
 * Runs a DOM update inside `document.startViewTransition` when the browser
 * supports it and the user hasn't asked for reduced motion; otherwise the
 * update runs directly. Callers must put *all* DOM mutation for the change
 * inside the callback — the browser snapshots before and after it runs.
 */
export function withViewTransition(update: () => void): void {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  if (typeof document.startViewTransition === 'function' && !reduceMotion) {
    document.startViewTransition(update)
  } else {
    update()
  }
}
