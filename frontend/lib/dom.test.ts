import { describe, it, expect, afterEach } from 'vitest'
import { must } from './dom'

describe('must', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the matched element', () => {
    document.body.innerHTML = '<div class="x"></div>'
    expect(must(document, '.x')).toBeInstanceOf(HTMLDivElement)
  })

  it('throws when nothing matches', () => {
    document.body.innerHTML = ''
    expect(() => must(document, '.missing')).toThrow(/no element matches/i)
  })
})
