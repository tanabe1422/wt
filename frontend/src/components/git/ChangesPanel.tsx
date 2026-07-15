import { useMemo, type MouseEvent } from 'react'

import type { FileStatus, RepoOperationKind } from '../../types'
import type { SectionMode, SectionSelection } from '../../hooks/useSectionSelection'
import { cx } from '../../utils/cx'
import { sortFileStatuses } from '../../utils/gitStatus'
import { FileList } from './FileList'
import styles from './ChangesPanel.module.css'

interface ChangesPanelProps {
  staged: FileStatus[]
  unstaged: FileStatus[]
  loading: boolean
  stagedSelection: SectionSelection
  unstagedSelection: SectionSelection
  repoOperation?: RepoOperationKind
  conflictCount?: number
  canContinueRebase?: boolean
  onFileClick: (
    path: string,
    index: number,
    mode: SectionMode,
    files: FileStatus[],
    event: MouseEvent,
  ) => void
  onStage: (path: string) => void
  onUnstage: (path: string) => void
  onStageSelected: () => void
  onUnstageSelected: () => void
  onStageAll: () => void
  onUnstageAll: () => void
  onDiscardSelected?: () => void
  onDiscardAll?: () => void
  onContinueRebase?: () => void
  onAbortOperation?: () => void
  onFileHover?: (path: string, mode: 'staged' | 'unstaged') => void
  onFileContextMenu?: (
    entry: FileStatus,
    event: MouseEvent,
    mode: 'staged' | 'unstaged',
  ) => void
}

function operationBannerText(
  repoOperation: RepoOperationKind,
  conflictCount: number,
): string {
  if (repoOperation === 'rebase') {
    return conflictCount > 0
      ? `リベース競合: ${conflictCount} ファイル`
      : 'リベース進行中'
  }
  if (conflictCount > 0) {
    return `マージ競合: ${conflictCount} ファイル`
  }
  return 'マージ進行中'
}

export function ChangesPanel({
  staged,
  unstaged,
  loading,
  stagedSelection,
  unstagedSelection,
  repoOperation = 'none',
  conflictCount = 0,
  canContinueRebase = false,
  onFileClick,
  onStage,
  onUnstage,
  onStageSelected,
  onUnstageSelected,
  onStageAll,
  onUnstageAll,
  onDiscardSelected,
  onDiscardAll,
  onContinueRebase,
  onAbortOperation,
  onFileHover,
  onFileContextMenu,
}: ChangesPanelProps) {
  const showOperationBanner = repoOperation !== 'none' || conflictCount > 0
  const bannerOperation: RepoOperationKind =
    repoOperation !== 'none' ? repoOperation : conflictCount > 0 ? 'merge' : 'none'
  const hasAnyChanges = staged.length > 0 || unstaged.length > 0
  const showDiscardActions = Boolean(onDiscardAll || onDiscardSelected)
  const sortedStaged = useMemo(() => sortFileStatuses(staged, 'staged'), [staged])
  const sortedUnstaged = useMemo(() => sortFileStatuses(unstaged, 'unstaged'), [unstaged])

  return (
    <div className={styles.panel}>
      {showOperationBanner && bannerOperation !== 'none' && (
        <div className={styles.mergeBanner} role="status">
          <span className={styles.mergeBannerText}>
            {operationBannerText(bannerOperation, conflictCount)}
          </span>
          <div className={styles.bannerActions}>
            {bannerOperation === 'rebase' && onContinueRebase && (
              <button
                type="button"
                className={styles.bannerContinue}
                disabled={!canContinueRebase}
                onClick={onContinueRebase}
              >
                続行
              </button>
            )}
            {onAbortOperation && (
              <button type="button" className={styles.mergeAbort} onClick={onAbortOperation}>
                {bannerOperation === 'rebase' ? 'リベースを中止' : 'マージを中止'}
              </button>
            )}
          </div>
        </div>
      )}
      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span className={styles.headingStart}>ステージ済み</span>
          <span className={styles.headingActions}>
            <button
              type="button"
              className={styles.headingAction}
              disabled={sortedStaged.length === 0}
              onClick={onUnstageAll}
            >
              すべて除く
            </button>
            <button
              type="button"
              className={styles.headingAction}
              disabled={stagedSelection.paths.size === 0}
              onClick={onUnstageSelected}
            >
              選択を除く
            </button>
          </span>
        </h2>
        <FileList
          files={sortedStaged}
          mode="staged"
          loading={loading}
          selectedPaths={stagedSelection.paths}
          focusPath={stagedSelection.focus}
          onFileClick={(path, index, event) =>
            onFileClick(path, index, 'staged', sortedStaged, event)
          }
          onFileHover={(path) => onFileHover?.(path, 'staged')}
          onFileContextMenu={(entry, event) => onFileContextMenu?.(entry, event, 'staged')}
          onUnstage={onUnstage}
        />
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span className={styles.headingStart}>変更</span>
          <span className={styles.headingActions}>
            <button
              type="button"
              className={styles.headingAction}
              disabled={sortedUnstaged.length === 0}
              onClick={onStageAll}
            >
              すべて追加
            </button>
            <button
              type="button"
              className={styles.headingAction}
              disabled={unstagedSelection.paths.size === 0}
              onClick={onStageSelected}
            >
              選択を追加
            </button>
            {showDiscardActions ? (
              <>
                <span className={styles.headingActionsSep} aria-hidden="true" />
                {onDiscardAll && (
                  <button
                    type="button"
                    className={cx(styles.headingAction, styles.headingActionDanger)}
                    disabled={!hasAnyChanges}
                    onClick={onDiscardAll}
                  >
                    すべて破棄
                  </button>
                )}
                {onDiscardSelected && (
                  <button
                    type="button"
                    className={cx(styles.headingAction, styles.headingActionDanger)}
                    disabled={unstagedSelection.paths.size === 0}
                    onClick={onDiscardSelected}
                  >
                    選択を破棄
                  </button>
                )}
              </>
            ) : null}
          </span>
        </h2>
        <FileList
          files={sortedUnstaged}
          mode="unstaged"
          loading={loading}
          selectedPaths={unstagedSelection.paths}
          focusPath={unstagedSelection.focus}
          onFileClick={(path, index, event) =>
            onFileClick(path, index, 'unstaged', sortedUnstaged, event)
          }
          onFileHover={(path) => onFileHover?.(path, 'unstaged')}
          onFileContextMenu={(entry, event) => onFileContextMenu?.(entry, event, 'unstaged')}
          onStage={onStage}
        />
      </section>
    </div>
  )
}
