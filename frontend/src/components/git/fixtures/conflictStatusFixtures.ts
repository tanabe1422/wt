import type { FileStatus } from '../../../types'

export const conflictStagedFiles: FileStatus[] = [
  { path: 'src/main.go', index: 'M', workTree: ' ', staged: true, isDirectory: false },
  { path: 'src/new-file.ts', index: 'A', workTree: ' ', staged: true, isDirectory: false },
]

export const conflictUnstagedNormal: FileStatus[] = [
  { path: 'README.md', index: ' ', workTree: 'M', staged: false, isDirectory: false },
  { path: 'notes.md', index: '?', workTree: '?', staged: false, isDirectory: false },
]

export const conflictFiles: FileStatus[] = [
  { path: 'src/conflict.ts', index: 'U', workTree: 'U', staged: true, isDirectory: false },
  { path: 'pkg/both-added.go', index: 'A', workTree: 'A', staged: true, isDirectory: false },
]

/** Pull 衝突後: ステージ済み変更 + 競合ファイル + 通常の未ステージ */
export const afterPullConflictStaged = conflictStagedFiles

export const afterPullConflictUnstaged: FileStatus[] = [
  ...conflictFiles,
  ...conflictUnstagedNormal,
]

export const conflictOnlyUnstaged: FileStatus[] = [...conflictFiles]

/** Story / 表示用: Pull 衝突時のエラーダイアログ文言 */
export const pullConflictError = {
  title: 'プルに失敗しました',
  message:
    'マージ中に競合が発生しました。競合を解決してからコミットしてください。',
} as const

/** Story / 表示用: mergetool 起動失敗 */
export const mergetoolError = {
  title: '競合解決ツールの起動に失敗しました',
  message:
    'mergetool が設定されていません。git config で merge.tool を設定してください。',
} as const
