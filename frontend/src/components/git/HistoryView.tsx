import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'

import { useCommitHistory } from '../../hooks/useCommitHistory'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { errorMessage } from '../../lib/errorMessage'
import { resetToCommit } from '../../lib/wails'
import type { HistoryScope } from '../../types'
import { shortSha } from '../../utils/commitGraph'
import { cx } from '../../utils/cx'
import { ChoiceDialog, type ChoiceOption } from '../ui/ChoiceDialog'
import { ContextMenu } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import { CommitDetailPane } from './CommitDetailPane'
import { CommitHistoryTable } from './CommitHistoryTable'
import styles from './HistoryView.module.css'

const STORAGE_KEY_TREE_RATIO = 'wt-manager.historyTreeRatio'
const DEFAULT_TREE_RATIO = 0.55
const MIN_TREE_RATIO = 0.25
const MAX_TREE_RATIO = 0.75

type ResetMode = 'soft' | 'mixed' | 'hard'

const RESET_OPTIONS: ChoiceOption<ResetMode>[] = [
  {
    value: 'soft',
    label: 'ソフト',
    description: 'HEAD のみ移動。インデックスと作業ツリーは変更しません',
  },
  {
    value: 'mixed',
    label: 'ミックス',
    description: 'HEAD とインデックスを移動。作業ツリーの変更は残します',
  },
  {
    value: 'hard',
    label: 'ハード',
    description: 'HEAD・インデックス・作業ツリーをすべてリセットします',
  },
]

interface HistoryViewProps {
  worktreePath: string
  currentBranch: string
  onResetComplete?: () => void | Promise<void>
}

interface ScopeToggleProps {
  scope: HistoryScope
  loading: boolean
  branchAvailable: boolean
  onChange: (scope: HistoryScope) => void
}

function ScopeToggle({ scope, loading, branchAvailable, onChange }: ScopeToggleProps) {
  return (
    <div className={styles.scopeToggle} role="group" aria-label="履歴の表示範囲">
      <button
        type="button"
        className={cx(styles.scopeButton, scope === 'all' && styles.scopeActive)}
        disabled={loading}
        aria-pressed={scope === 'all'}
        onClick={() => onChange('all')}
      >
        全ブランチ
      </button>
      <button
        type="button"
        className={cx(styles.scopeButton, scope === 'branch' && styles.scopeActive)}
        disabled={loading || !branchAvailable}
        aria-pressed={scope === 'branch'}
        title={branchAvailable ? undefined : 'ブランチにチェックアウトされていません'}
        onClick={() => onChange('branch')}
      >
        現在ブランチ
      </button>
    </div>
  )
}

export function HistoryView({
  worktreePath,
  currentBranch,
  onResetComplete,
}: HistoryViewProps) {
  const branchAvailable = currentBranch !== '' && currentBranch !== 'HEAD'
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const { ratio: treeRatio, resizing, splitRef, handleResizeStart } = useResizableSplit({
    storageKey: STORAGE_KEY_TREE_RATIO,
    defaultRatio: DEFAULT_TREE_RATIO,
    minRatio: MIN_TREE_RATIO,
    maxRatio: MAX_TREE_RATIO,
    orientation: 'vertical',
  })
  const {
    scope,
    setScope,
    commits,
    labels,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
  } = useCommitHistory({ worktreePath, currentBranch })

  const errorDialog = useErrorDialog(error)
  const actionErrorDialog = useErrorDialog(actionError)
  const { menu, openMenu, closeMenu } = useContextMenu()

  useEffect(() => {
    setSelectedSha(null)
  }, [worktreePath, scope])

  const selectedCommit = useMemo(
    () => commits.find((commit) => commit.sha === selectedSha) ?? null,
    [commits, selectedSha],
  )

  const handleLoadMore = useCallback(() => {
    void loadMore()
  }, [loadMore])

  const { scrollRef, sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: handleLoadMore,
  })

  const handleContextMenu = useCallback(
    (sha: string, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      openMenu(event.clientX, event.clientY, [
        {
          label: 'このコミットまでリセット',
          onClick: () => setResetTarget(sha),
        },
      ])
    },
    [openMenu],
  )

  const handleResetConfirm = async (mode: ResetMode) => {
    if (!resetTarget || acting) {
      return
    }
    const sha = resetTarget
    setResetTarget(null)
    setActing(true)
    setActionError(null)
    try {
      await resetToCommit(worktreePath, sha, mode)
      setSelectedSha(null)
      await reload()
      await onResetComplete?.()
    } catch (err) {
      setActionError(errorMessage(err, 'リセットに失敗しました'))
    } finally {
      setActing(false)
    }
  }

  if (!worktreePath) {
    return (
      <div className={styles.placeholder}>
        <p>ワークツリーを選択してください</p>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <ScopeToggle
        scope={scope}
        loading={loading}
        branchAvailable={branchAvailable}
        onChange={setScope}
      />
      {loading && commits.length === 0 ? (
        <div className={styles.placeholder}>
          <p>コミット履歴を読み込み中…</p>
        </div>
      ) : (
        <div
          ref={splitRef}
          className={cx(styles.split, resizing && styles.splitResizing)}
        >
          <div className={styles.treePane} style={{ flex: `${treeRatio} 1 0%` }}>
            <div ref={scrollRef} className={styles.scroll}>
              <CommitHistoryTable
                commits={commits}
                labels={labels}
                selectedSha={selectedSha}
                onSelect={setSelectedSha}
                onContextMenu={handleContextMenu}
              />
              <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
              {loadingMore && <p className={styles.loadingMore}>さらに読み込み中…</p>}
            </div>
          </div>
          <ResizeHandle
            orientation="vertical"
            onPointerDown={handleResizeStart}
            ariaLabel="履歴と詳細の高さを調整"
            active={resizing}
          />
          <div className={styles.detailPane} style={{ flex: `${1 - treeRatio} 1 0%` }}>
            <CommitDetailPane worktreePath={worktreePath} commit={selectedCommit} />
          </div>
        </div>
      )}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
      )}
      <ChoiceDialog
        open={resetTarget !== null}
        title="このコミットまでリセット"
        message={
          resetTarget
            ? `コミット ${shortSha(resetTarget)} までリセットします。モードを選択してください。`
            : undefined
        }
        options={RESET_OPTIONS}
        defaultValue="mixed"
        confirmLabel="リセット"
        warningForValue="hard"
        warningMessage="ハードリセットは未コミットの変更を破棄します。"
        onConfirm={(mode) => {
          void handleResetConfirm(mode)
        }}
        onCancel={() => setResetTarget(null)}
      />
      <ErrorDialog
        open={errorDialog.open}
        title="コミット履歴の取得に失敗しました"
        message={errorDialog.message}
        onClose={errorDialog.dismiss}
      />
      <ErrorDialog
        open={actionErrorDialog.open}
        title="リセットに失敗しました"
        message={actionErrorDialog.message}
        onClose={() => {
          actionErrorDialog.dismiss()
          setActionError(null)
        }}
      />
    </div>
  )
}
