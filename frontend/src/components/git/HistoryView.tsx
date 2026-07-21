import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'

import { useCommitHistory } from '../../hooks/useCommitHistory'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { errorMessage } from '../../lib/errorMessage'
import { cherryPick, getRepoOperationState, resetToCommit } from '../../lib/wails'
import type { CommitSearchType, HistoryScope, OpenApp, RepoOperationKind } from '../../types'
import { shortSha } from '../../utils/commitGraph'
import { cx } from '../../utils/cx'
import { ChoiceDialog, type ChoiceOption } from '../ui/ChoiceDialog'
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import { CommitDetailPane } from './CommitDetailPane'
import { CommitHistoryTable } from './CommitHistoryTable'
import { CompareDetailPane, type CompareRange } from './CompareDetailPane'
import styles from './HistoryView.module.css'

const STORAGE_KEY_TREE_RATIO = 'wt-manager.historyTreeRatio'
const DEFAULT_TREE_RATIO = 0.55
const MIN_TREE_RATIO = 0.25
const MAX_TREE_RATIO = 0.75

type ResetMode = 'soft' | 'mixed' | 'hard'

type DetailMode =
  | { kind: 'commit'; sha: string }
  | { kind: 'compare'; fromRef: string; toRef: string }

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
  openApps?: OpenApp[]
  compareRequest?: CompareRange | null
  onCompareRequestConsumed?: () => void
  onResetComplete?: () => void | Promise<void>
  /** 同一 WT 内のコンテンツ変更（ブランチ切替など）。履歴を再取得する。 */
  contentRevision?: number
}

interface HistoryScopeBarProps {
  scope: HistoryScope
  branchAvailable: boolean
  onScopeChange: (scope: HistoryScope) => void
  searchType: CommitSearchType
  onSearchTypeChange: (type: CommitSearchType) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

const SEARCH_TYPE_OPTIONS: { value: CommitSearchType; label: string }[] = [
  { value: 'path', label: 'ファイル' },
  { value: 'message', label: 'メッセージ' },
  { value: 'author', label: '作者' },
  { value: 'sha', label: 'SHA' },
]

function searchPlaceholder(type: CommitSearchType): string {
  switch (type) {
    case 'message':
      return 'コミットメッセージを検索'
    case 'author':
      return '作者名・メール'
    case 'path':
      return 'ファイル名・パス（例: hoge.tsx, ./hoge.tsx）'
    case 'sha':
      return 'コミット SHA'
  }
}

function HistoryScopeBar({
  scope,
  branchAvailable,
  onScopeChange,
  searchType,
  onSearchTypeChange,
  searchQuery,
  onSearchQueryChange,
}: HistoryScopeBarProps) {
  const showAll = scope === 'all'
  // On = すべてのブランチ。Off = 現在ブランチのみ。
  // loading では disabled にしない（切替のたびに色がチカつくため）。
  const canTurnOff = branchAvailable
  const disabled = showAll && !canTurnOff

  return (
    <div className={styles.scopeBar}>
      <label
        className={styles.scopeToggle}
        title={
          disabled
            ? 'ブランチにチェックアウトされていません'
            : undefined
        }
      >
        <input
          type="checkbox"
          className={styles.scopeCheckbox}
          checked={showAll}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.checked) {
              onScopeChange('all')
            } else if (canTurnOff) {
              onScopeChange('branch')
            }
          }}
        />
        すべてのブランチを表示する
      </label>
      <div className={styles.searchControls}>
        <select
          className={styles.searchType}
          value={searchType}
          onChange={(event) => onSearchTypeChange(event.target.value as CommitSearchType)}
          aria-label="検索種別"
        >
          {SEARCH_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={searchPlaceholder(searchType)}
          aria-label="コミットを検索"
        />
      </div>
    </div>
  )
}

function compareBaseRef(currentBranch: string): string {
  return currentBranch !== '' ? currentBranch : 'HEAD'
}

export function HistoryView({
  worktreePath,
  currentBranch,
  openApps = [],
  compareRequest = null,
  onCompareRequestConsumed,
  onResetComplete,
  contentRevision = 0,
}: HistoryViewProps) {
  const branchAvailable = currentBranch !== '' && currentBranch !== 'HEAD'
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [detailMode, setDetailMode] = useState<DetailMode | null>(null)
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [repoOperation, setRepoOperation] = useState<RepoOperationKind>('none')
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
    searchType,
    setSearchType,
    searchQuery,
    setSearchQuery,
    activeSearchQuery,
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
  const searching = activeSearchQuery !== ''
  const highlightPathQuery =
    searchType === 'path' && activeSearchQuery !== '' ? activeSearchQuery : ''

  useEffect(() => {
    if (contentRevision === 0) {
      return
    }
    void reload()
  }, [contentRevision, reload])

  useEffect(() => {
    if (!worktreePath) {
      setRepoOperation('none')
      return
    }
    void getRepoOperationState(worktreePath)
      .then((state) => setRepoOperation(state.kind))
      .catch(() => setRepoOperation('none'))
  }, [worktreePath, commits, loading])

  const operationBusy = repoOperation !== 'none'

  useEffect(() => {
    setSelectedSha(null)
    setDetailMode(null)
    onCompareRequestConsumed?.()
  }, [worktreePath, scope, searchType, activeSearchQuery, onCompareRequestConsumed])

  useEffect(() => {
    if (!compareRequest) {
      return
    }
    setSelectedSha(null)
    setDetailMode({
      kind: 'compare',
      fromRef: compareRequest.fromRef,
      toRef: compareRequest.toRef,
    })
  }, [compareRequest])

  const selectedCommit = useMemo(
    () => commits.find((commit) => commit.sha === selectedSha) ?? null,
    [commits, selectedSha],
  )

  const handleSelectCommit = useCallback(
    (sha: string) => {
      setSelectedSha(sha)
      setDetailMode({ kind: 'commit', sha })
      onCompareRequestConsumed?.()
    },
    [onCompareRequestConsumed],
  )

  const handleLoadMore = useCallback(() => {
    void loadMore()
  }, [loadMore])

  const { scrollRef, sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: handleLoadMore,
  })

  const handleCherryPick = useCallback(
    async (sha: string) => {
      if (acting || operationBusy) {
        return
      }
      setActing(true)
      setActionError(null)
      try {
        await cherryPick(worktreePath, sha)
        await reload()
        await onResetComplete?.()
      } catch (err) {
        try {
          const state = await getRepoOperationState(worktreePath)
          if (state.kind === 'cherry-pick') {
            setRepoOperation('cherry-pick')
            await reload()
            await onResetComplete?.()
            return
          }
        } catch {
          // fall through to error dialog
        }
        setActionError(errorMessage(err, 'cherry-pick に失敗しました'))
      } finally {
        setActing(false)
      }
    },
    [acting, onResetComplete, operationBusy, reload, worktreePath],
  )

  const handleContextMenu = useCallback(
    (sha: string, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const fromRef = compareBaseRef(currentBranch)
      const items: ContextMenuEntry[] = [
        {
          label: '現在のブランチとの Diff を表示',
          onClick: () => {
            setSelectedSha(null)
            setDetailMode({ kind: 'compare', fromRef, toRef: sha })
            onCompareRequestConsumed?.()
          },
        },
      ]
      if (selectedSha && selectedSha !== sha) {
        items.push({
          label: '選択中のコミットとの Diff を表示',
          onClick: () => {
            setSelectedSha(null)
            setDetailMode({
              kind: 'compare',
              fromRef: selectedSha,
              toRef: sha,
            })
            onCompareRequestConsumed?.()
          },
        })
      }
      items.push(
        { type: 'separator' },
        {
          label: 'このコミットを cherry-pick',
          disabled: operationBusy || acting,
          onClick: () => {
            void handleCherryPick(sha)
          },
        },
        {
          label: 'このコミットまでリセット',
          disabled: operationBusy,
          onClick: () => setResetTarget(sha),
        },
      )
      openMenu(event.clientX, event.clientY, items)
    },
    [
      acting,
      currentBranch,
      handleCherryPick,
      onCompareRequestConsumed,
      openMenu,
      operationBusy,
      selectedSha,
    ],
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
      setDetailMode(null)
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

  const detailPane =
    detailMode?.kind === 'compare' ? (
      <CompareDetailPane
        worktreePath={worktreePath}
        openApps={openApps}
        range={{ fromRef: detailMode.fromRef, toRef: detailMode.toRef }}
      />
    ) : (
      <CommitDetailPane
        worktreePath={worktreePath}
        openApps={openApps}
        commit={detailMode?.kind === 'commit' ? selectedCommit : null}
        highlightPathQuery={highlightPathQuery}
      />
    )

  return (
    <div className={styles.root}>
      <HistoryScopeBar
        scope={scope}
        branchAvailable={branchAvailable}
        onScopeChange={setScope}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
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
              onSelect={handleSelectCommit}
              onContextMenu={handleContextMenu}
              showGraph={!searching}
              loading={loading && commits.length === 0}
              emptyMessage={
                searching ? '該当するコミットがありません' : 'コミットがありません'
              }
            />
            <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
            {loadingMore && (
              <p className={styles.loadingMore}>
                {searching ? '検索を続けています…' : 'さらに読み込み中…'}
              </p>
            )}
          </div>
        </div>
        <ResizeHandle
          orientation="vertical"
          onPointerDown={handleResizeStart}
          ariaLabel="履歴と詳細の高さを調整"
          active={resizing}
        />
        <div className={styles.detailPane} style={{ flex: `${1 - treeRatio} 1 0%` }}>
          {detailPane}
        </div>
      </div>
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
