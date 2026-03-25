import * as cartEvents from './cart-events.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addToCart, updateCartItem, updateCartNote } from './cart-api.js'

describe('addToCart', () => {
  beforeEach(() => {
    // Mock window.routes and window.location
    // These have to mocked because they are not available in the test environment
    window.routes = { cart_add_url: '/cart/add.js' }
    window.location = { pathname: '/products/test' }
    document.body.innerHTML = '' // no cart-drawer = default sections

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) })
    )
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends minimum required payload with string variantId coerced to number', async () => {
    await addToCart({ variantId: '123' })

    expect(fetch).toHaveBeenCalledWith('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        id: 123,
        quantity: 1,
        sections: ['cart-icon-bubble'],
        sections_url: '/products/test'
      })
    })
  })

  it('dispatches error when no variantId provided', async () => {
    await addToCart({})

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'No variant ID provided',
      action: 'add'
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('dispatches `cart:adding` event before fetch', async () => {
    await addToCart({ variantId: '123', quantity: 2 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('adding', {
      variantId: '123',
      quantity: 2
    })
  })

  it('dispatches `cart:added` event on success', async () => {
    const mockResponse = {
      items: [{ id: 123 }],
      sections: { 'cart-icon-bubble': '<div>cart</div>' }
    }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockResponse) })
    )

    await addToCart({ variantId: '123', quantity: 1 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('added', {
      variantId: 123,
      quantity: 1,
      response: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches error when API returns status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ status: 422, description: 'Product is sold out' })
      })
    )

    await addToCart({ variantId: '123' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Product is sold out',
      action: 'add'
    })
  })

  it('dispatches error when fetch throws', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    await addToCart({ variantId: '123' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Network error',
      action: 'add'
    })
  })

  it('includes properties in body when provided', async () => {
    await addToCart({
      variantId: '123',
      properties: { 'Gift Message': 'Happy birthday!' }
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.properties).toEqual({ 'Gift Message': 'Happy birthday!' })
  })

  it('includes selling_plan in body when provided', async () => {
    await addToCart({
      variantId: '123',
      sellingPlanId: '987654'
    })

    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.selling_plan).toBe(987654)
  })
})

describe('updateCartItem', () => {
  beforeEach(() => {
    window.routes = { cart_change_url: '/cart/change.js' }
    window.location = { pathname: '/cart' }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ item_count: 2, sections: {} })
      })
    )
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends minimum required payload with string quantity coerced to number', async () => {
    await updateCartItem({ line: '1', quantity: '3', sections: ['cart-items'] })

    expect(fetch).toHaveBeenCalledWith('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        line: '1',
        quantity: 3,
        sections: ['cart-items'],
        sections_url: '/cart'
      })
    })
  })

  it('dispatches error when no line provided', async () => {
    await updateCartItem({ quantity: 1 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'No line item index provided',
      action: 'update'
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('dispatches updating event before fetch', async () => {
    await updateCartItem({ line: '1', quantity: 2 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('updating', {
      line: '1',
      quantity: 2
    })
  })

  it('dispatches removing event when quantity is 0', async () => {
    await updateCartItem({ line: '1', quantity: 0 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('removing', {
      line: '1'
    })
  })

  it('dispatches updated event on success', async () => {
    const mockResponse = { item_count: 2, sections: { 'cart-items': '<div>' } }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockResponse) })
    )

    await updateCartItem({ line: '1', quantity: 2 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('updated', {
      line: '1',
      cart: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches removed event when quantity is 0 and succeeds', async () => {
    const mockResponse = { item_count: 1, sections: {} }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockResponse) })
    )

    await updateCartItem({ line: '1', quantity: 0 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('removed', {
      line: '1',
      cart: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches error when API returns status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ status: 422, description: 'Quantity unavailable' })
      })
    )

    await updateCartItem({ line: '1', quantity: 5 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Quantity unavailable',
      action: 'update'
    })
  })

  it('dispatches error with remove action when quantity 0 fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    await updateCartItem({ line: '1', quantity: 0 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Network error',
      action: 'remove'
    })
  })

  it('returns cart data on success', async () => {
    const mockResponse = { item_count: 2, sections: {} }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockResponse) })
    )

    const result = await updateCartItem({ line: '1', quantity: 2 })

    expect(result).toEqual(mockResponse)
  })

  it('returns undefined on error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const result = await updateCartItem({ line: '1', quantity: 2 })

    expect(result).toBeUndefined()
  })
})

describe('updateCartNote', () => {
  beforeEach(() => {
    window.routes = { cart_update_url: '/cart/update.js' }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ note: 'Test note', item_count: 2 })
      })
    )
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends note in request body', async () => {
    await updateCartNote({ note: 'Please gift wrap' })

    expect(fetch).toHaveBeenCalledWith('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ note: 'Please gift wrap' })
    })
  })

  it('dispatches note-updated event on success', async () => {
    const mockCart = { note: 'Test note', item_count: 2 }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockCart) })
    )

    await updateCartNote({ note: 'Test note' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('note-updated', {
      note: 'Test note',
      cart: mockCart
    })
  })

  it('dispatches error when API returns status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ status: 422, description: 'Invalid note' })
      })
    )

    await updateCartNote({ note: 'Bad note' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Invalid note',
      action: 'note-update'
    })
  })

  it('dispatches error when fetch throws', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    await updateCartNote({ note: 'Test' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Network error',
      action: 'note-update'
    })
  })

  it('returns cart data on success', async () => {
    const mockCart = { note: 'Test', item_count: 2 }
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockCart) })
    )

    const result = await updateCartNote({ note: 'Test' })

    expect(result).toEqual(mockCart)
  })

  it('returns undefined on error', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const result = await updateCartNote({ note: 'Test' })

    expect(result).toBeUndefined()
  })
})
