import type { FileStatus } from '../types'
import { isConflict, isUntracked } from '../utils/gitStatus'

export type ConfirmAction =
  | { kind: 'discard'; paths: string[] }
  | { kind: 'delete'; paths: string[] }
  | { kind: 'mixed'; discardPaths: string[]; deletePaths: string[] }
  | { kind: 'discardAll' }
  | { kind: 'abort' }

export function partitionDiscardPaths(
  paths: string[],
  unstaged: FileStatus[],
): { discardPaths: string[]; deletePaths: string[] } {
  const discardPaths: string[] = []
  const deletePaths: string[] = []
  for (const path of paths) {
    const entry = unstaged.find((item) => item.path === path)
    if (!entry || isConflict(entry)) {
      continue
    }
    if (isUntracked(entry)) {
      deletePaths.push(path)
    } else {
      discardPaths.push(path)
    }
  }
  return { discardPaths, deletePaths }
}

export function confirmActionFromPartition(
  discardPaths: string[],
  deletePaths: string[],
): ConfirmAction | null {
  if (discardPaths.length === 0 && deletePaths.length === 0) {
    return null
  }
  if (discardPaths.length > 0 && deletePaths.length > 0) {
    return { kind: 'mixed', discardPaths, deletePaths }
  }
  if (deletePaths.length > 0) {
    return { kind: 'delete', paths: deletePaths }
  }
  return { kind: 'discard', paths: discardPaths }
}

export function confirmDialogTitle(action: ConfirmAction | null): string {
  if (action?.kind === 'abort') {
    return 'マージを中止'
  }
  if (action?.kind === 'discardAll') {
    return 'すべて破棄'
  }
  if (action?.kind === 'delete') {
    return '未追跡ファイルを削除'
  }
  if (action?.kind === 'mixed') {
    return '変更を破棄 / 削除'
  }
  return '変更を破棄'
}

export function confirmDialogMessage(action: ConfirmAction | null): string {
  if (!action) {
    return ''
  }
  if (action.kind === 'abort') {
    return '進行中のマージを中止しますか？競合の解決内容は失われます。'
  }
  if (action.kind === 'discardAll') {
    return 'ステージ済み・未ステージの変更と未追跡ファイルをすべて破棄します。この操作は取り消せません。'
  }
  if (action.kind === 'delete') {
    const n = action.paths.length
    return n === 1
      ? `未追跡ファイル「${action.paths[0]}」を削除しますか？`
      : `未追跡ファイル ${n} 件を削除しますか？`
  }
  if (action.kind === 'mixed') {
    return `追跡ファイル ${action.discardPaths.length} 件の変更を破棄し、未追跡ファイル ${action.deletePaths.length} 件を削除しますか？`
  }
  const n = action.paths.length
  return n === 1
    ? `「${action.paths[0]}」の変更を破棄しますか？`
    : `${n} 件のファイルの変更を破棄しますか？`
}

export function confirmDialogLabel(action: ConfirmAction | null): string {
  if (action?.kind === 'abort') {
    return '中止'
  }
  if (action?.kind === 'discardAll') {
    return 'すべて破棄'
  }
  if (action?.kind === 'delete') {
    return '削除'
  }
  return '破棄'
}
