import { cx } from '../../utils/cx'
import type { BranchTreeNode as BranchTreeNodeType } from '../../utils/branchTree'
import { getBranchMarkFlags } from '../../utils/branchMarks'
import { useTreeExpansion } from '../../hooks/useTreeExpansion'
import { Button } from '../ui/Button'
import { CountBadge } from '../ui/CountBadge'
import { ActiveMark } from './ActiveMark'
import {
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  GitBranchIcon,
} from './BranchIcons'
import styles from './BranchTreeNode.module.css'
import type { MouseEvent } from 'react'

const INDENT_BASE = 8
const INDENT_STEP = 16

function indentForDepth(depth: number): number {
  return INDENT_BASE + depth * INDENT_STEP
}

interface BranchTreeNodeProps {
  node: BranchTreeNodeType
  depth: number
  selectedBranch: string | null
  onSelect: (fullName: string) => void
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
  expansionThreshold?: number
  onActivate?: (fullName: string) => void
  onContextMenu?: (fullName: string, event: MouseEvent) => void
}

function renderBranchRow(
  fullName: string,
  label: string,
  paddingLeft: number,
  aheadCount: number,
  behindCount: number,
  selectedBranch: string | null,
  checkedOutBranch: string | null,
  worktreeBranches: Set<string>,
  onSelect: (fullName: string) => void,
  onActivate?: (fullName: string) => void,
  onContextMenu?: (fullName: string, event: MouseEvent) => void,
) {
  const isSelected = selectedBranch === fullName
  const marks = getBranchMarkFlags(fullName, checkedOutBranch, worktreeBranches)

  return (
    <Button
      variant="plain"
      className={cx(
        styles.item,
        isSelected && styles.selected,
        marks.isCheckedOutOnSelected && styles.checkedOut,
      )}
      style={{ paddingLeft }}
      title={fullName}
      onClick={() => onSelect(fullName)}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onActivate?.(fullName)
      }}
      onContextMenu={(event) => onContextMenu?.(fullName, event)}
    >
      <span className={styles.leading}>
        <ActiveMark
          active={marks.isCheckedOutOnSelected}
          title="選択中のワークツリーでチェックアウト中"
        />
        <span className={styles.caret} />
      </span>
      <span
        className={styles.iconSlot}
        title={marks.hasWorktree ? 'ワークツリーあり' : undefined}
      >
        {marks.hasWorktree ? <BriefcaseIcon /> : <GitBranchIcon />}
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.badgeGroup}>
        <CountBadge count={behindCount} variant="behind" />
        <CountBadge count={aheadCount} variant="ahead" />
      </span>
    </Button>
  )
}

export function BranchTreeNode({
  node,
  depth,
  selectedBranch,
  onSelect,
  checkedOutBranch,
  worktreeBranches,
  expansionThreshold = 1,
  onActivate,
  onContextMenu,
}: BranchTreeNodeProps) {
  const paddingLeft = indentForDepth(depth)
  const isLeaf = Boolean(node.fullName) && node.children.length === 0
  const isFolder = node.children.length > 0
  const [expanded, setExpanded] = useTreeExpansion(depth, expansionThreshold)

  if (isLeaf && node.fullName) {
    return renderBranchRow(
      node.fullName,
      node.name,
      paddingLeft,
      node.aheadCount ?? 0,
      node.behindCount ?? 0,
      selectedBranch,
      checkedOutBranch,
      worktreeBranches,
      onSelect,
      onActivate,
      onContextMenu,
    )
  }

  if (isFolder) {
    return (
      <div className={styles.branch}>
        <Button
          variant="plain"
          className={styles.item}
          style={{ paddingLeft }}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={styles.leading}>
            <ActiveMark active={false} />
            <span className={styles.caret}>
              {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </span>
          </span>
          <span className={styles.folderIcon}>
            <FolderIcon />
          </span>
          <span className={styles.label}>{node.name}</span>
        </Button>
        {expanded &&
          node.children.map((child) => (
            <BranchTreeNode
              key={`${node.name}/${child.name}`}
              node={child}
              depth={depth + 1}
              selectedBranch={selectedBranch}
              onSelect={onSelect}
              checkedOutBranch={checkedOutBranch}
              worktreeBranches={worktreeBranches}
              expansionThreshold={expansionThreshold}
              onActivate={onActivate}
              onContextMenu={onContextMenu}
            />
          ))}
      </div>
    )
  }

  if (node.fullName) {
    return renderBranchRow(
      node.fullName,
      node.name,
      paddingLeft,
      node.aheadCount ?? 0,
      node.behindCount ?? 0,
      selectedBranch,
      checkedOutBranch,
      worktreeBranches,
      onSelect,
      onActivate,
      onContextMenu,
    )
  }

  return null
}
