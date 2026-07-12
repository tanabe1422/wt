import type { FileStatus } from '../types'

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
