import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce, fetchConfig } from './utils.js'

describe('fetchConfig', () => {
  it('should return the correct fetch config', () => {
    expect(fetchConfig()).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
  })

  it('returns POST method by default', () => {
    expect(fetchConfig()).toHaveProperty('method', 'POST')
  })

  it('returns JSON Accept header by default', () => {
    expect(fetchConfig()).toHaveProperty('headers.Accept', 'application/json')
  })

  it('returns JSON Content-Type header by default', () => {
    expect(fetchConfig()).toHaveProperty(
      'headers.Content-Type',
      'application/json'
    )
  })
})

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('calls functio after wait period', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledOnce()
  })

  it('only calls once for rapid fire calls', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn('a')
    debouncedFn('b')
    debouncedFn('c')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('c')
  })
})
