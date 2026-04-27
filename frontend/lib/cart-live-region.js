/**
 * @file Cart accessibility live-region announcer.
 *
 * Announces cart changes to screen readers via the global
 * `<p id="cart-live-region-text">` element rendered in `layout/theme.liquid`.
 *
 * The clear-then-set pattern below is intentional: setting `textContent`
 * to the same string a second time does NOT trigger an `aria-live`
 * announcement, so we always blank the region first, then write the new
 * message in a microtask so the DOM mutation is observed as a true change.
 */
import { onCartEvent } from './cart-events.js'

const ANNOUNCE_DELAY_MS = 50

let pendingTimer = null

/**
 * Announce a message to the cart live region.
 * Repeated calls cancel any pending announcement (last write wins).
 * No-ops if the message is falsy or the live region element is not on the page.
 * @param {string} message
 */
export function announce(message) {
  if (!message) return
  const region = document.getElementById('cart-live-region-text')
  if (!region) return

  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
  }

  region.textContent = ''
  pendingTimer = setTimeout(() => {
    region.textContent = message
    pendingTimer = null
  }, ANNOUNCE_DELAY_MS)
}

/**
 * Wire global cart events to live-region announcements.
 * Call once at app boot from `cart-init.js`.
 */
export function initCartAnnouncements() {
  onCartEvent('added', () => {
    announce(window.cartStrings?.added)
  })
  onCartEvent('removed', () => {
    announce(window.cartStrings?.removed)
  })
  onCartEvent('updated', () => {
    announce(window.cartStrings?.updated)
  })
  onCartEvent('error', ({ error }) => {
    announce(error || window.cartStrings?.error)
  })
}
