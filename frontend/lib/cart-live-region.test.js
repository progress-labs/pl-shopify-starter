import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { announce } from './cart-live-region.js'

describe('announce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<p id="cart-live-region-text" aria-live="polite" role="status"></p>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('writes the message to the live region after the delay', () => {
    announce('Item added to cart')
    const region = document.getElementById('cart-live-region-text')

    expect(region.textContent).toBe('')

    vi.runAllTimers()
    expect(region.textContent).toBe('Item added to cart')
  })

  it('clears the region before writing so identical messages re-trigger', () => {
    const region = document.getElementById('cart-live-region-text')
    region.textContent = 'Item added to cart'

    announce('Item added to cart')

    expect(region.textContent).toBe('')

    vi.runAllTimers()
    expect(region.textContent).toBe('Item added to cart')
  })

  it('cancels the previous announcement when called rapidly', () => {
    announce('First message')
    announce('Second message')

    vi.runAllTimers()

    const region = document.getElementById('cart-live-region-text')
    expect(region.textContent).toBe('Second message')
  })

  it('no-ops silently when the live region element is missing', () => {
    document.body.innerHTML = ''
    expect(() => announce('Anything')).not.toThrow()
    vi.runAllTimers()
  })

  it('no-ops when message is falsy', () => {
    const region = document.getElementById('cart-live-region-text')
    region.textContent = 'previous'

    announce(undefined)
    vi.runAllTimers()
    expect(region.textContent).toBe('previous')

    announce('')
    vi.runAllTimers()
    expect(region.textContent).toBe('previous')
  })
})

import { dispatchCartEvent } from './cart-events.js'
import { initCartAnnouncements } from './cart-live-region.js'

describe('initCartAnnouncements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<p id="cart-live-region-text" aria-live="polite" role="status"></p>'
    window.cartStrings = {
      added: 'Item added to cart',
      removed: 'Item removed from cart',
      updated: 'Cart updated',
      error: 'Cart error'
    }
    initCartAnnouncements()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    delete window.cartStrings
  })

  it('announces "added" string on cart:added', () => {
    dispatchCartEvent('added', { variantId: 1 })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Item added to cart'
    )
  })

  it('announces "removed" string on cart:removed', () => {
    dispatchCartEvent('removed', { line: '1' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Item removed from cart'
    )
  })

  it('announces "updated" string on cart:updated', () => {
    dispatchCartEvent('updated', { line: '1' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Cart updated'
    )
  })

  it('announces error detail on cart:error', () => {
    dispatchCartEvent('error', { error: 'Out of stock', action: 'add' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Out of stock'
    )
  })

  it('falls back to default error string when error detail is missing', () => {
    dispatchCartEvent('error', { action: 'add' })
    vi.runAllTimers()
    expect(document.getElementById('cart-live-region-text').textContent).toBe(
      'Cart error'
    )
  })
})
