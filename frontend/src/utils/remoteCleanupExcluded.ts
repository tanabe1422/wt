import { localBranchFromRemote } from './branchTree'

/** Whether a remote-tracking ref is covered by the cleanup exclusion list. */
export function isRemoteCleanupExcluded(
  remoteRef: string,
  excludedLocalNames: readonly string[],
): boolean {
  if (excludedLocalNames.length === 0) {
    return false
  }
  let localName: string
  try {
    localName = localBranchFromRemote(remoteRef)
  } catch {
    return excludedLocalNames.includes(remoteRef)
  }
  return excludedLocalNames.includes(localName) || excludedLocalNames.includes(remoteRef)
}
