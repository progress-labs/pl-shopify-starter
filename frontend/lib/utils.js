/**
 * @param {'json'|'javascript'} [type='json'] - Accept header type
 * @returns {{ method: 'POST', headers: { 'Content-Type': string, Accept: string } }}
 */
export function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`
    }
  }
}

export function debounce(fn, wait) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn.apply(this, args), wait)
  }
}
