import { describe, it, expect, vi, afterEach } from 'vitest'
import { dispatchCartEvent, onCartEvent } from './cart-events'

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

    dispatchCartEvent('added', {
      variantId: 123,
      quantity: 2,
      response: {},
      sections: {}
    })

    expect(handler.mock.calls[0][0].detail).toEqual({
      variantId: 123,
      quantity: 2,
      response: {},
      sections: {}
    })
    document.removeEventListener('cart:added', handler)
  })

  it('passes error detail', () => {
    const handler = vi.fn()
    document.addEventListener('cart:error', handler)

    dispatchCartEvent('error', {
      error: 'Something went wrong',
      action: 'add'
    })

    expect(handler.mock.calls[0][0].detail).toEqual({
      error: 'Something went wrong',
      action: 'add'
    })
    document.removeEventListener('cart:error', handler)
  })
})

describe('onCartEvent', () => {
  it('subscribes to cart: prefixed events', () => {
    const callback = vi.fn()
    onCartEvent('adding', callback)

    dispatchCartEvent('adding', { variantId: 456, quantity: 1 })

    expect(callback).toHaveBeenCalledOnce()
  })

  it('passes event detail to callback', () => {
    const callback = vi.fn()
    onCartEvent('updated', callback)

    dispatchCartEvent('updated', { line: 1, cart: {}, sections: {} })

    expect(callback).toHaveBeenCalledWith({ line: 1, cart: {}, sections: {} })
  })

  it('returns unsubscribe function', () => {
    const callback = vi.fn()
    const unsubscribe = onCartEvent('removed', callback)
    const detail = { line: 1, cart: {}, sections: {} }

    dispatchCartEvent('removed', detail)
    expect(callback).toHaveBeenCalledOnce()

    unsubscribe()

    dispatchCartEvent('removed', detail)
    expect(callback).toHaveBeenCalledOnce() // still 1, not 2
  })
})
