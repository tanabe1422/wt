import type { CommitFileChange, FileStatus } from '../types'

export function isConflict(entry: FileStatus): boolean {
  if (entry.index === 'U' || entry.workTree === 'U') {
    return true
  }
  if (entry.index === 'A' && entry.workTree === 'A') {
    return true
  }
  if (entry.index === 'D' && entry.workTree === 'D') {
    return true
  }
  return false
}

export function isUntracked(entry: FileStatus): boolean {
  return entry.index === '?' && entry.workTree === '?'
}

export function hasStagedChange(entry: FileStatus): boolean {
  if (isConflict(entry)) {
    return false
  }
  return entry.index !== ' ' && entry.index !== '?'
}

export function hasUnstagedChange(entry: FileStatus): boolean {
  if (isConflict(entry)) {
    return true
  }
  if (entry.index === '?' && entry.workTree === '?') {
    return true
  }
  return entry.workTree !== ' '
}

/** 一覧表示用: conflict → modified → added/untracked → renamed → deleted */
export function changeStatusSortRank(code: string): number {
  const letter = code.trim().charAt(0)
  switch (letter) {
    case 'U':
      return 0
    case 'M':
    case 'T':
      return 1
    case 'A':
    case 'N':
    case '?':
      return 2
    case 'R':
    case 'C':
      return 3
    case 'D':
      return 4
    default:
      return 5
  }
}

function statusCodeForList(entry: FileStatus, mode: 'staged' | 'unstaged'): string {
  if (isConflict(entry)) {
    return 'U'
  }
  return mode === 'staged' ? entry.index : entry.workTree
}

export function sortFileStatuses(
  files: FileStatus[],
  mode: 'staged' | 'unstaged',
): FileStatus[] {
  return [...files].sort((a, b) => {
    const rank =
      changeStatusSortRank(statusCodeForList(a, mode)) -
      changeStatusSortRank(statusCodeForList(b, mode))
    if (rank !== 0) {
      return rank
    }
    return a.path.localeCompare(b.path)
  })
}

export function sortCommitFileChanges(files: CommitFileChange[]): CommitFileChange[] {
  return [...files].sort((a, b) => {
    const rank = changeStatusSortRank(a.status) - changeStatusSortRank(b.status)
    if (rank !== 0) {
      return rank
    }
    return a.path.localeCompare(b.path)
  })
}
