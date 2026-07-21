import type { FileStatus } from '../types'
import { isConflict, isUntracked } from '../utils/gitStatus'

export type ConfirmAction =
  | { kind: 'discard'; paths: string[] }
  | { kind: 'delete'; paths: string[] }
  | { kind: 'mixed'; discardPaths: string[]; deletePaths: string[] }
  | { kind: 'discardAll'; paths: string[] }
  | { kind: 'abort'; operation: 'merge' | 'rebase' | 'cherry-pick' }

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
    if (action.operation === 'rebase') {
      return 'リベースを中止'
    }
    if (action.operation === 'cherry-pick') {
      return 'cherry-pick を中止'
    }
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
    if (action.operation === 'rebase') {
      return '進行中のリベースを中止しますか？ブランチはリベース開始前の状態に戻ります。'
    }
    if (action.operation === 'cherry-pick') {
      return '進行中の cherry-pick を中止しますか？競合の解決内容は失われます。'
    }
    return '進行中のマージを中止しますか？競合の解決内容は失われます。'
  }
  if (action.kind === 'discardAll') {
    return '未ステージの変更・削除をすべて破棄します。ステージ済みの変更と未追跡ファイルは残ります。'
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
