/**
 * @param type - Accept header type
 */
export function fetchConfig(type: 'json' | 'javascript' = 'json') {
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
 * @param fn - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
) {
  let t: ReturnType<typeof setTimeout>
  return (...args: A) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}
