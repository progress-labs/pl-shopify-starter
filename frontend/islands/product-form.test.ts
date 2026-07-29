import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { onCartEvent } from '@/lib/cart-events'
import './product-form'

function mountForm() {
  document.body.innerHTML = `
    <product-form>
      <form id="product-form-1" data-type="add-to-cart-form">
        <input type="hidden" name="id" value="42" disabled>
        <input type="hidden" name="quantity" value="1">
        <button type="submit" name="add"><span>Add</span></button>
        <div data-error-message hidden></div>
      </form>
    </product-form>`
  return document.querySelector('form') as HTMLFormElement
}

describe('product-form double-submit guard', () => {
  beforeEach(() => {
    window.routes = { cart_add_url: '', cart_change_url: '', cart_update_url: '', cart_url: '' }
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dispatches cart:add only once for a double submit', () => {
    const form = mountForm()
    const adds = vi.fn()
    onCartEvent('add', adds)

    form.requestSubmit()
    form.requestSubmit() // second submit while the first is pending

    expect(adds).toHaveBeenCalledTimes(1)
  })
})
