import type { MouseEvent } from 'react'

import type { BranchEntry, WorktreeEntry } from '../../types'
import {
  collectWorktreeBranches,
  getSelectedWorktreeBranch,
} from '../../utils/branchMarks'
import { splitBranchTrees } from '../../utils/branchTree'
import { BranchSectionIcon, CloudIcon, WorktreeIcon } from './BranchIcons'
import { BranchSection } from './BranchSection'
import { SidebarSection } from './SidebarSection'
import { WorktreeList } from './WorktreeList'
import styles from './BranchSidebar.module.css'

export interface RepoSidebarContentProps {
  branches: BranchEntry[]
  worktrees: WorktreeEntry[]
  selectedBranch: string | null
  selectedWorktree: string | null
  onSelectBranch: (fullName: string) => void
  onSelectWorktree: (path: string) => void
  showWorktreeMarks?: boolean
  onActivateLocal?: (fullName: string) => void
  onActivateRemote?: (fullName: string) => void
  onLocalContextMenu?: (fullName: string, event: MouseEvent) => void
  onRemoteContextMenu?: (fullName: string, event: MouseEvent) => void
}

export function RepoSidebarContent({
  branches,
  worktrees,
  selectedBranch,
  selectedWorktree,
  onSelectBranch,
  onSelectWorktree,
  showWorktreeMarks = true,
  onActivateLocal,
  onActivateRemote,
  onLocalContextMenu,
  onRemoteContextMenu,
}: RepoSidebarContentProps) {
  const { local, remote } = splitBranchTrees(branches)
  const worktreeBranches = collectWorktreeBranches(worktrees)
  const checkedOutBranch = getSelectedWorktreeBranch(worktrees, selectedWorktree)

  return (
    <>
      <SidebarSection title="ワークツリー" icon={<WorktreeIcon />}>
        {worktrees.length === 0 ? (
          <p className={styles.emptyInline}>ワークツリーがありません</p>
        ) : (
          <WorktreeList
            worktrees={worktrees}
            selectedWorktree={selectedWorktree}
            onSelect={onSelectWorktree}
          />
        )}
      </SidebarSection>

      {branches.length === 0 ? (
        <p className={styles.emptyInline}>ブランチがありません</p>
      ) : (
        <>
          <BranchSection
            title="ブランチ"
            icon={<BranchSectionIcon />}
            nodes={local}
            selectedBranch={selectedBranch}
            onSelect={onSelectBranch}
            checkedOutBranch={checkedOutBranch}
            worktreeBranches={worktreeBranches}
            showWorktreeMarks={showWorktreeMarks}
            onActivate={onActivateLocal}
            onContextMenu={onLocalContextMenu}
          />
          {remote.length > 0 && (
            <BranchSection
              title="リモート"
              icon={<CloudIcon />}
              nodes={remote}
              selectedBranch={selectedBranch}
              onSelect={onSelectBranch}
              checkedOutBranch={checkedOutBranch}
              worktreeBranches={new Set()}
              onActivate={onActivateRemote}
              onContextMenu={onRemoteContextMenu}
            />
          )}
        </>
      )}
    </>
  )
}
