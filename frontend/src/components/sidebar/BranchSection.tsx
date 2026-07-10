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
  defaultExpanded?: boolean
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
  defaultExpanded = true,
  onActivate,
  onContextMenu,
}: BranchSectionProps) {
  return (
    <SidebarSection title={title} icon={icon} defaultExpanded={defaultExpanded}>
      {nodes.map((node) => (
        <BranchTreeNode
          key={node.name}
          node={node}
          depth={0}
          selectedBranch={selectedBranch}
          onSelect={onSelect}
          checkedOutBranch={showWorktreeMarks ? checkedOutBranch : null}
          worktreeBranches={showWorktreeMarks ? worktreeBranches : new Set()}
          expansionThreshold={2}
          onActivate={onActivate}
          onContextMenu={onContextMenu}
        />
      ))}
    </SidebarSection>
  )
}
