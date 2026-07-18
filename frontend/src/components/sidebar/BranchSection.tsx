import type { MouseEvent, ReactNode } from 'react'

import type { BranchTreeNode as BranchTreeNodeType } from '../../utils/branchTree'
import { BranchTreeNode } from './BranchTreeNode'
import { SidebarSection } from './SidebarSection'

interface BranchSectionProps {
  title: string
  icon: ReactNode
  nodes: BranchTreeNodeType[]
  selectedBranch: string | null
  onSelect: (fullName: string) => void
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
  showWorktreeMarks?: boolean
  /** 行アイコンを fill 版にする（サイドバーは outline がデフォルト） */
  filledIcons?: boolean
  /**
   * 通常ブランチのアイコンを隠し、スロット幅だけ維持。
   * 未指定時は showWorktreeMarks に追従（ローカル=隠す / リモート=出す）。
   */
  hideIdleIcons?: boolean
  /** ワークツリーあり行に WT バッジを出す（比較用） */
  showWorktreeBadge?: boolean
  defaultExpanded?: boolean
  expansionThreshold?: number
  /** 展開状態の永続化スコープ（リポジトリパスなど） */
  expansionScope?: string | null
  /** ブランチツリー先頭に差し込む情報行（detached HEAD など） */
  leading?: ReactNode
  /** 見出し右端のアクション */
  headerAction?: ReactNode
  onActivate?: (fullName: string) => void
  onContextMenu?: (fullName: string, event: MouseEvent) => void
}

export function BranchSection({
  title,
  icon,
  nodes,
  selectedBranch,
  onSelect,
  checkedOutBranch,
  worktreeBranches,
  showWorktreeMarks = false,
  filledIcons = false,
  hideIdleIcons,
  showWorktreeBadge = false,
  defaultExpanded = true,
  expansionThreshold = 2,
  expansionScope = null,
  leading = null,
  headerAction = null,
  onActivate,
  onContextMenu,
}: BranchSectionProps) {
  const resolvedHideIdleIcons = hideIdleIcons ?? showWorktreeMarks
  const sectionStorageKey = expansionScope ? `${expansionScope}\0section\0${title}` : null
  const treeScope = expansionScope ? `${expansionScope}\0tree\0${title}` : null

  return (
    <SidebarSection
      title={title}
      icon={icon}
      defaultExpanded={defaultExpanded}
      storageKey={sectionStorageKey}
      headerAction={headerAction}
    >
      {leading}
      {nodes.map((node) => (
        <BranchTreeNode
          key={node.name}
          node={node}
          depth={0}
          nodePath={node.name}
          expansionScope={treeScope}
          selectedBranch={selectedBranch}
          onSelect={onSelect}
          checkedOutBranch={showWorktreeMarks ? checkedOutBranch : null}
          worktreeBranches={showWorktreeMarks ? worktreeBranches : new Set()}
          toneByWorktree={showWorktreeMarks}
          filledIcons={filledIcons}
          hideIdleIcons={resolvedHideIdleIcons}
          showWorktreeBadge={showWorktreeBadge}
          expansionThreshold={expansionThreshold}
          onActivate={onActivate}
          onContextMenu={onContextMenu}
        />
      ))}
    </SidebarSection>
  )
}
