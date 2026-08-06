import * as cartEvents from './cart-events'

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { addToCart, updateCartItem, updateCartNote } from './cart-api'

// jsdom's `window.location` setter only accepts a navigation string, so
// tests stub it through a plain data-property view of window instead.
function stubLocation(pathname: string): void {
  ;(window as unknown as { location: { pathname: string } }).location = {
    pathname
  }
}

describe('addToCart', () => {
  let fetchMock: Mock<typeof fetch>

  beforeEach(() => {
    // Mock window.routes and window.location
    // These have to mocked because they are not available in the test environment
    window.routes = {
      cart_add_url: '/cart/add.js'
    } as unknown as Window['routes']
    stubLocation('/products/test')
    document.body.innerHTML = '' // no cart-drawer = default sections

    // Mock fetch
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({})
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends minimum required payload with string variantId coerced to number', async () => {
    await addToCart({ variantId: '123' })

    expect(fetchMock).toHaveBeenCalledWith('/cart/add.js', {
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
      }),
      signal: expect.any(AbortSignal)
    })
  })

  it('dispatches error when no variantId provided', async () => {
    // Deliberately violates the CartAddDetail contract to exercise the
    // runtime guard for callers that bypass the type system.
    await addToCart({} as Parameters<typeof addToCart>[0])

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'No variant ID provided',
      action: 'add'
    })
    expect(fetchMock).not.toHaveBeenCalled()
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
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await addToCart({ variantId: '123', quantity: 1 })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('added', {
      variantId: 123,
      quantity: 1,
      response: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches error when API returns status', async () => {
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({ status: 422, description: 'Product is sold out' })
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await addToCart({ variantId: '123' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Product is sold out',
      action: 'add'
    })
  })

  it('dispatches error when fetch throws', async () => {
    fetchMock = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await addToCart({ variantId: '123' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: new Error('Network error'),
      action: 'add'
    })
  })

  it('includes properties in body when provided', async () => {
    await addToCart({
      variantId: '123',
      properties: { 'Gift Message': 'Happy birthday!' }
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(body.properties).toEqual({ 'Gift Message': 'Happy birthday!' })
  })

  it('includes selling_plan in body when provided', async () => {
    await addToCart({
      variantId: '123',
      sellingPlanId: '987654'
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(body.selling_plan).toBe(987654)
  })
})

describe('updateCartItem', () => {
  let fetchMock: Mock<typeof fetch>

  beforeEach(() => {
    window.routes = {
      cart_change_url: '/cart/change.js'
    } as unknown as Window['routes']
    stubLocation('/cart')

    fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ item_count: 2, sections: {} })
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends minimum required payload with string quantity coerced to number', async () => {
    await updateCartItem({ line: '1', quantity: '3', sections: ['cart-items'] })

    expect(fetchMock).toHaveBeenCalledWith('/cart/change.js', {
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
      }),
      signal: expect.any(AbortSignal)
    })
  })

  it('dispatches error when no line provided', async () => {
    // Deliberately violates the CartUpdateDetail contract to exercise the
    // runtime guard for callers that bypass the type system.
    await updateCartItem({
      quantity: 1
    } as Parameters<typeof updateCartItem>[0])

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'No line item index provided',
      action: 'update'
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('dispatches updating event before fetch', async () => {
    await updateCartItem({ line: '1', quantity: 2, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('updating', {
      line: '1',
      quantity: 2
    })
  })

  it('dispatches removing event when quantity is 0', async () => {
    await updateCartItem({ line: '1', quantity: 0, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('removing', {
      line: '1'
    })
  })

  it('dispatches updated event on success', async () => {
    const mockResponse = { item_count: 2, sections: { 'cart-items': '<div>' } }
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartItem({ line: '1', quantity: 2, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('updated', {
      line: '1',
      cart: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches removed event when quantity is 0 and succeeds', async () => {
    const mockResponse = { item_count: 1, sections: {} }
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartItem({ line: '1', quantity: 0, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('removed', {
      line: '1',
      cart: mockResponse,
      sections: mockResponse.sections
    })
  })

  it('dispatches error when API returns status', async () => {
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({ status: 422, description: 'Quantity unavailable' })
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartItem({ line: '1', quantity: 5, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Quantity unavailable',
      action: 'update'
    })
  })

  it('dispatches error with remove action when quantity 0 fails', async () => {
    fetchMock = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartItem({ line: '1', quantity: 0, sections: [] })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: new Error('Network error'),
      action: 'remove'
    })
  })

  it('returns cart data on success', async () => {
    const mockResponse = { item_count: 2, sections: {} }
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    const result = await updateCartItem({
      line: '1',
      quantity: 2,
      sections: []
    })

    expect(result).toEqual(mockResponse)
  })

  it('returns undefined on error', async () => {
    fetchMock = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    const result = await updateCartItem({
      line: '1',
      quantity: 2,
      sections: []
    })

    expect(result).toBeUndefined()
  })
})

describe('updateCartNote', () => {
  let fetchMock: Mock<typeof fetch>

  beforeEach(() => {
    window.routes = {
      cart_update_url: '/cart/update.js'
    } as unknown as Window['routes']

    fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ note: 'Test note', item_count: 2 })
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock
    vi.spyOn(cartEvents, 'dispatchCartEvent')
  })

  it('sends note in request body', async () => {
    await updateCartNote({ note: 'Please gift wrap' })

    expect(fetchMock).toHaveBeenCalledWith('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ note: 'Please gift wrap' }),
      signal: expect.any(AbortSignal)
    })
  })

  it('dispatches note-updated event on success', async () => {
    const mockCart = { note: 'Test note', item_count: 2 }
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockCart)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartNote({ note: 'Test note' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('note-updated', {
      note: 'Test note',
      cart: mockCart
    })
  })

  it('dispatches error when API returns status', async () => {
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({ status: 422, description: 'Invalid note' })
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartNote({ note: 'Bad note' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: 'Invalid note',
      action: 'note-update'
    })
  })

  it('dispatches error when fetch throws', async () => {
    fetchMock = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    await updateCartNote({ note: 'Test' })

    expect(cartEvents.dispatchCartEvent).toHaveBeenCalledWith('error', {
      error: new Error('Network error'),
      action: 'note-update'
    })
  })

  it('returns cart data on success', async () => {
    const mockCart = { note: 'Test', item_count: 2 }
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockCart)
      })
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    const result = await updateCartNote({ note: 'Test' })

    expect(result).toEqual(mockCart)
  })

  it('returns undefined on error', async () => {
    fetchMock = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as Mock<typeof fetch>
    globalThis.fetch = fetchMock

    const result = await updateCartNote({ note: 'Test' })

    expect(result).toBeUndefined()
  })
})
