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
