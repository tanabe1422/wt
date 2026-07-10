/**
 * Extracts a user-facing message from a rejected promise / caught value.
 * Wails v2 rejects Go errors as plain strings, not Error instances.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message || fallback
  }
  if (typeof err === 'string') {
    return err || fallback
  }
  return fallback
}
