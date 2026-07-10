import type { MouseEvent } from 'react'

import type { FileStatus } from '../../types'
import type { SectionMode, SectionSelection } from '../../hooks/useSectionSelection'
import { FileList } from './FileList'
import { GitAreaIcon } from './GitIcons'
import styles from './ChangesPanel.module.css'

interface ChangesPanelProps {
  staged: FileStatus[]
  unstaged: FileStatus[]
  loading: boolean
  stagedSelection: SectionSelection
  unstagedSelection: SectionSelection
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
  onFileContextMenu?: (entry: FileStatus, event: MouseEvent) => void
}

export function ChangesPanel({
  staged,
  unstaged,
  loading,
  stagedSelection,
  unstagedSelection,
  onFileClick,
  onStage,
  onUnstage,
  onStageSelected,
  onUnstageSelected,
  onStageAll,
  onUnstageAll,
  onFileContextMenu,
}: ChangesPanelProps) {
  return (
    <div className={styles.panel}>
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
          onFileContextMenu={onFileContextMenu}
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
          onFileContextMenu={onFileContextMenu}
          onStage={onStage}
        />
      </section>
    </div>
  )
}
