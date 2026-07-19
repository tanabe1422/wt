import type { MouseEvent, ReactNode } from 'react'
import { useMemo } from 'react'

import type { BranchEntry, StashEntry, WorktreeEntry } from '../../types'
import {
  collectWorktreeBranches,
  getSelectedWorktreeBranch,
} from '../../utils/branchMarks'
import { isDetachedWorktree } from '../../utils/detachedHead'
import { filterBranchTree, splitBranchTrees } from '../../utils/branchTree'
import { BranchSectionIcon, CloudIcon, StashIcon, WorktreeIcon } from './BranchIcons'
import { BranchSection } from './BranchSection'
import { DetachedHeadRow } from './DetachedHeadRow'
import { SidebarSection } from './SidebarSection'
import { StashList } from './StashList'
import { WorktreeList } from './WorktreeList'
import styles from './BranchSidebar.module.css'

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function filterWorktrees(worktrees: WorktreeEntry[], query: string): WorktreeEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return worktrees
  }
  return worktrees.filter((worktree) => {
    const branch = (worktree.branch || '').toLowerCase()
    const name = baseName(worktree.path).toLowerCase()
    const path = worktree.path.toLowerCase()
    return branch.includes(normalized) || name.includes(normalized) || path.includes(normalized)
  })
}

function filterStashes(stashes: StashEntry[], query: string): StashEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return stashes
  }
  return stashes.filter((stash) => {
    return (
      stash.message.toLowerCase().includes(normalized) ||
      stash.ref.toLowerCase().includes(normalized)
    )
  })
}

export interface RepoSidebarContentProps {
  branches: BranchEntry[]
  worktrees: WorktreeEntry[]
  stashes?: StashEntry[]
  selectedBranch: string | null
  selectedWorktree: string | null
  onSelectBranch: (fullName: string) => void
  onSelectWorktree: (path: string) => void
  showWorktreeMarks?: boolean
  filterQuery?: string
  /** 展開状態の永続化スコープ（通常はリポジトリパス） */
  expansionScope?: string | null
  onActivateLocal?: (fullName: string) => void
  onActivateRemote?: (fullName: string) => void
  onLocalContextMenu?: (fullName: string, event: MouseEvent) => void
  onRemoteContextMenu?: (fullName: string, event: MouseEvent) => void
  onWorktreeContextMenu?: (worktree: WorktreeEntry, event: MouseEvent) => void
  onStashContextMenu?: (stash: StashEntry, event: MouseEvent) => void
  /** 「ワークツリー」見出し右のアクション */
  worktreeHeaderAction?: ReactNode
  /** ローカル「ブランチ」見出し右のアクション */
  localBranchHeaderAction?: ReactNode
  /** 「リモート」見出し右のアクション */
  remoteBranchHeaderAction?: ReactNode
  /** 「スタッシュ」見出し右のアクション */
  stashHeaderAction?: ReactNode
}

export function RepoSidebarContent({
  branches,
  worktrees,
  stashes = [],
  selectedBranch,
  selectedWorktree,
  onSelectBranch,
  onSelectWorktree,
  showWorktreeMarks = true,
  filterQuery = '',
  expansionScope = null,
  onActivateLocal,
  onActivateRemote,
  onLocalContextMenu,
  onRemoteContextMenu,
  onWorktreeContextMenu,
  onStashContextMenu,
  worktreeHeaderAction = null,
  localBranchHeaderAction = null,
  remoteBranchHeaderAction = null,
  stashHeaderAction = null,
}: RepoSidebarContentProps) {
  const { localUnfiltered, remoteUnfiltered } = useMemo(() => {
    const trees = splitBranchTrees(branches)
    return {
      localUnfiltered: trees.local,
      remoteUnfiltered: trees.remote,
    }
  }, [branches])
  const local = useMemo(
    () => filterBranchTree(localUnfiltered, filterQuery),
    [localUnfiltered, filterQuery],
  )
  const remote = useMemo(
    () => filterBranchTree(remoteUnfiltered, filterQuery),
    [remoteUnfiltered, filterQuery],
  )
  const filteredWorktrees = useMemo(
    () => filterWorktrees(worktrees, filterQuery),
    [worktrees, filterQuery],
  )
  const filteredStashes = useMemo(
    () => filterStashes(stashes, filterQuery),
    [stashes, filterQuery],
  )
  const worktreeBranches = collectWorktreeBranches(worktrees)
  const checkedOutBranch = getSelectedWorktreeBranch(worktrees, selectedWorktree)
  const selectedWorktreeEntry =
    worktrees.find((entry) => entry.path === selectedWorktree) ?? null
  const showDetachedHead =
    selectedWorktreeEntry !== null && isDetachedWorktree(selectedWorktreeEntry)
  const filtering = filterQuery.trim().length > 0
  const expansionThreshold = filtering ? 99 : 2

  return (
    <>
      <SidebarSection
        title="ワークツリー"
        icon={<WorktreeIcon />}
        storageKey={expansionScope ? `${expansionScope}\0section\0ワークツリー` : null}
        headerAction={worktreeHeaderAction}
      >
        {filteredWorktrees.length === 0 ? (
          filtering ? null : (
            <p className={styles.emptyInline}>ワークツリーがありません</p>
          )
        ) : (
          <WorktreeList
            worktrees={filteredWorktrees}
            selectedWorktree={selectedWorktree}
            onSelect={onSelectWorktree}
            onContextMenu={onWorktreeContextMenu}
          />
        )}
      </SidebarSection>

      {branches.length === 0 && !showDetachedHead ? (
        <p className={styles.emptyInline}>ブランチがありません</p>
      ) : (
        <>
          {(localUnfiltered.length > 0 || showDetachedHead) && (
            <BranchSection
              title="ブランチ"
              icon={<BranchSectionIcon />}
              nodes={local}
              selectedBranch={selectedBranch}
              onSelect={onSelectBranch}
              checkedOutBranch={checkedOutBranch}
              worktreeBranches={worktreeBranches}
              showWorktreeMarks={showWorktreeMarks}
              expansionThreshold={expansionThreshold}
              expansionScope={expansionScope}
              headerAction={localBranchHeaderAction}
              leading={
                showDetachedHead ? (
                  <DetachedHeadRow head={selectedWorktreeEntry?.head} />
                ) : null
              }
              onActivate={onActivateLocal}
              onContextMenu={onLocalContextMenu}
            />
          )}
          {remoteUnfiltered.length > 0 && (
            <BranchSection
              title="リモート"
              icon={<CloudIcon />}
              nodes={remote}
              selectedBranch={selectedBranch}
              onSelect={onSelectBranch}
              checkedOutBranch={checkedOutBranch}
              worktreeBranches={new Set()}
              expansionThreshold={expansionThreshold}
              expansionScope={expansionScope}
              headerAction={remoteBranchHeaderAction}
              onActivate={onActivateRemote}
              onContextMenu={onRemoteContextMenu}
            />
          )}
        </>
      )}

      <SidebarSection
        title="スタッシュ"
        icon={<StashIcon />}
        storageKey={expansionScope ? `${expansionScope}\0section\0スタッシュ` : null}
        headerAction={stashHeaderAction}
      >
        {filteredStashes.length === 0 ? (
          filtering ? null : (
            <p className={styles.emptyInline}>スタッシュはありません</p>
          )
        ) : (
          <StashList stashes={filteredStashes} onContextMenu={onStashContextMenu} />
        )}
      </SidebarSection>
    </>
  )
}
