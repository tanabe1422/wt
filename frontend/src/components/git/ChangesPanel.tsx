import type { MouseEvent } from 'react'

import type { FileStatus } from '../../types'
import type { SectionMode, SectionSelection } from '../../hooks/useSectionSelection'
import { cx } from '../../utils/cx'
import { FileList } from './FileList'
import { GitAreaIcon } from './GitIcons'
import styles from './ChangesPanel.module.css'

interface ChangesPanelProps {
  staged: FileStatus[]
  unstaged: FileStatus[]
  loading: boolean
  stagedSelection: SectionSelection
  unstagedSelection: SectionSelection
  conflictCount?: number
  merging?: boolean
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
  onAbortMerge?: () => void
  onFileContextMenu?: (
    entry: FileStatus,
    event: MouseEvent,
    mode: 'staged' | 'unstaged',
  ) => void
}

export function ChangesPanel({
  staged,
  unstaged,
  loading,
  stagedSelection,
  unstagedSelection,
  conflictCount = 0,
  merging = false,
  onFileClick,
  onStage,
  onUnstage,
  onStageSelected,
  onUnstageSelected,
  onStageAll,
  onUnstageAll,
  onDiscardSelected,
  onDiscardAll,
  onAbortMerge,
  onFileContextMenu,
}: ChangesPanelProps) {
  const showMergeBanner = merging || conflictCount > 0
  const hasAnyChanges = staged.length > 0 || unstaged.length > 0
  const showDiscardActions = Boolean(onDiscardAll || onDiscardSelected)

  return (
    <div className={styles.panel}>
      {showMergeBanner && (
        <div className={styles.mergeBanner} role="status">
          <span className={styles.mergeBannerText}>
            {conflictCount > 0
              ? `マージ競合: ${conflictCount} ファイル`
              : 'マージ進行中'}
          </span>
          {onAbortMerge && (
            <button type="button" className={styles.mergeAbort} onClick={onAbortMerge}>
              マージを中止
            </button>
          )}
        </div>
      )}
      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span className={styles.headingStart}>
            <GitAreaIcon area="staged" />
            ステージ済み
          </span>
          <span className={styles.headingActions}>
            <button
              type="button"
              className={styles.headingAction}
              disabled={staged.length === 0}
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
          files={staged}
          mode="staged"
          loading={loading}
          selectedPaths={stagedSelection.paths}
          focusPath={stagedSelection.focus}
          onFileClick={(path, index, event) =>
            onFileClick(path, index, 'staged', staged, event)
          }
          onFileContextMenu={(entry, event) => onFileContextMenu?.(entry, event, 'staged')}
          onUnstage={onUnstage}
        />
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span className={styles.headingStart}>
            <GitAreaIcon area="changes" />
            変更
          </span>
          <span className={styles.headingActions}>
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
            {showDiscardActions && <span className={styles.headingActionsSep} aria-hidden />}
            <button
              type="button"
              className={styles.headingAction}
              disabled={unstaged.length === 0}
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
          </span>
        </h2>
        <FileList
          files={unstaged}
          mode="unstaged"
          loading={loading}
          selectedPaths={unstagedSelection.paths}
          focusPath={unstagedSelection.focus}
          onFileClick={(path, index, event) =>
            onFileClick(path, index, 'unstaged', unstaged, event)
          }
          onFileContextMenu={(entry, event) => onFileContextMenu?.(entry, event, 'unstaged')}
          onStage={onStage}
        />
      </section>
    </div>
  )
}
