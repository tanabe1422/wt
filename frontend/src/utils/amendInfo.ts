import type { AmendInfo } from '../types'

/** True when amend UI state is unchanged (avoids setState → re-render loops). */
export function amendInfoEqual(a: AmendInfo | null, b: AmendInfo | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    a.canAmend === b.canAmend &&
    a.reason === b.reason &&
    a.headMessage === b.headMessage
  )
}
