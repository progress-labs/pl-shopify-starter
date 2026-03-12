export function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`
    }
  }
}

/**
 * Returns a debounced version of `fn` that delays invocation until `wait`
 * milliseconds have elapsed since the last call.
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn.apply(this, args), wait)
  }
}
