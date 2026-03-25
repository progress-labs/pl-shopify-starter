import { describe, it, expect, vi, afterEach } from 'vitest'
import { dispatchCartEvent, onCartEvent } from './cart-events.js'

describe('dispatchCartEvent', () => {
  afterEach(() => {
    // Clean up any lingering listeners
    document.body.innerHTML = ''
  })

  it('dispatches event with cart: prefix', () => {
    const handler = vi.fn()
    document.addEventListener('cart:add', handler)

    dispatchCartEvent('add', { variantId: 123 })

    expect(handler).toHaveBeenCalledOnce()
    document.removeEventListener('cart:add', handler)
  })

  it('passes detail to event', () => {
    const handler = vi.fn()
    document.addEventListener('cart:added', handler)

    dispatchCartEvent('added', { variantId: 123, quantity: 2 })

    expect(handler.mock.calls[0][0].detail).toEqual({
      variantId: 123,
      quantity: 2
    })
    document.removeEventListener('cart:added', handler)
  })

  it('defaults detail to empty object', () => {
    const handler = vi.fn()
    document.addEventListener('cart:error', handler)

    dispatchCartEvent('error')

    expect(handler.mock.calls[0][0].detail).toEqual({})
    document.removeEventListener('cart:error', handler)
  })
})

describe('onCartEvent', () => {
  it('subscribes to cart: prefixed events', () => {
    const callback = vi.fn()
    onCartEvent('adding', callback)

    dispatchCartEvent('adding', { variantId: 456 })

    expect(callback).toHaveBeenCalledOnce()
  })

  it('passes event detail to callback', () => {
    const callback = vi.fn()
    onCartEvent('updated', callback)

    dispatchCartEvent('updated', { items: [1, 2, 3] })

    expect(callback).toHaveBeenCalledWith({ items: [1, 2, 3] })
  })

  it('returns unsubscribe function', () => {
    const callback = vi.fn()
    const unsubscribe = onCartEvent('removed', callback)

    dispatchCartEvent('removed', {})
    expect(callback).toHaveBeenCalledOnce()

    unsubscribe()

    dispatchCartEvent('removed', {})
    expect(callback).toHaveBeenCalledOnce() // still 1, not 2
  })
})
