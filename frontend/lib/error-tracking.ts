/**
 * @file Lightweight error-reporting facade.
 *
 * Importing this module never pulls in the Sentry SDK — islands and libs can
 * call `captureException` freely without affecting their chunk size. Calls
 * made before the SDK finishes loading (see lib/sentry.ts, dynamically
 * imported from the entrypoint) are buffered and flushed once it is ready.
 * With no DSN configured the buffer is simply never flushed.
 */
import type { ExclusiveEventHintOrCaptureContext } from '@sentry/browser'

type Reporter = (
  error: unknown,
  context?: ExclusiveEventHintOrCaptureContext
) => void

const MAX_BUFFERED = 20

const buffer: Array<[unknown, ExclusiveEventHintOrCaptureContext | undefined]> =
  []

let reporter: Reporter | null = null

export function captureException(
  error: unknown,
  context?: ExclusiveEventHintOrCaptureContext
): void {
  if (reporter) {
    reporter(error, context)
  } else if (buffer.length < MAX_BUFFERED) {
    buffer.push([error, context])
  }
}

/** Called by lib/sentry.ts once the SDK is initialized. */
export function setReporter(fn: Reporter): void {
  reporter = fn
  for (const [error, context] of buffer.splice(0)) {
    fn(error, context)
  }
}
