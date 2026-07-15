import { cx } from '../../utils/cx'
import type { BranchTreeNode as BranchTreeNodeType } from '../../utils/branchTree'
import { getBranchMarkFlags } from '../../utils/branchMarks'
import { useTreeExpansion } from '../../hooks/useTreeExpansion'
import { Button } from '../ui/Button'
import { CountBadge } from '../ui/CountBadge'
import { ActiveMark } from './ActiveMark'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  GitBranchIcon,
  HardDriveIcon,
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
  /** ワークツリー有無でラベル・アイコン色を分ける（ローカルブランチ用） */
  toneByWorktree?: boolean
  /** 行アイコンを fill 版にする */
  filledIcons?: boolean
  /** 通常ブランチのアイコンを隠し、スロット幅だけ維持 */
  hideIdleIcons?: boolean
  /** ワークツリーあり行に WT バッジを出す（比較用） */
  showWorktreeBadge?: boolean
  expansionThreshold?: number
  /** フォルダパス（展開状態キー用） */
  nodePath?: string
  /** 展開状態の永続化スコープ */
  expansionScope?: string | null
  onActivate?: (fullName: string) => void
  onContextMenu?: (fullName: string, event: MouseEvent) => void
}

function rowToneClass(
  toneByWorktree: boolean,
  marks: ReturnType<typeof getBranchMarkFlags>,
): string | false {
  if (!toneByWorktree) {
    return false
  }
  if (marks.isCheckedOutOnSelected) {
    return styles.toneActive
  }
  if (marks.hasWorktree) {
    return styles.toneWorktree
  }
  return styles.toneIdle
}

function renderBranchIcon(
  marks: ReturnType<typeof getBranchMarkFlags>,
  filledIcons: boolean,
  hideIdleIcons: boolean,
) {
  if (marks.hasWorktree) {
    return <HardDriveIcon />
  }
  if (hideIdleIcons) {
    return null
  }
  return <GitBranchIcon filled={filledIcons} />
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
  toneByWorktree: boolean,
  filledIcons: boolean,
  hideIdleIcons: boolean,
  showWorktreeBadge: boolean,
  onSelect: (fullName: string) => void,
  onActivate?: (fullName: string) => void,
  onContextMenu?: (fullName: string, event: MouseEvent) => void,
) {
  const isSelected = selectedBranch === fullName
  const marks = getBranchMarkFlags(fullName, checkedOutBranch, worktreeBranches)
  const toneClass = rowToneClass(toneByWorktree, marks)

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
      onContextMenu={(event) => {
        onSelect(fullName)
        onContextMenu?.(fullName, event)
      }}
    >
      <span className={styles.leading}>
        <ActiveMark
          active={marks.isCheckedOutOnSelected}
          title="選択中のワークツリーでチェックアウト中"
        />
        <span className={styles.caret} />
      </span>
      <span
        className={cx(styles.iconSlot, toneClass)}
        title={marks.hasWorktree ? 'ワークツリーあり' : undefined}
      >
        {renderBranchIcon(marks, filledIcons, hideIdleIcons)}
      </span>
      <span className={cx(styles.label, toneClass)}>{label}</span>
      {showWorktreeBadge && marks.hasWorktree && (
        <span className={styles.worktreeBadge} title="ワークツリーあり">
          WT
        </span>
      )}
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
  toneByWorktree = false,
  filledIcons = false,
  hideIdleIcons = false,
  showWorktreeBadge = false,
  expansionThreshold = 1,
  nodePath,
  expansionScope = null,
  onActivate,
  onContextMenu,
}: BranchTreeNodeProps) {
  const paddingLeft = indentForDepth(depth)
  const isLeaf = Boolean(node.fullName) && node.children.length === 0
  const isFolder = node.children.length > 0
  const resolvedPath = nodePath ?? node.name
  const storageKey =
    isFolder && expansionScope ? `${expansionScope}\0${resolvedPath}` : null
  const [expanded, setExpanded] = useTreeExpansion(depth, expansionThreshold, storageKey)

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
      toneByWorktree,
      filledIcons,
      hideIdleIcons,
      showWorktreeBadge,
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
              nodePath={`${resolvedPath}/${child.name}`}
              expansionScope={expansionScope}
              selectedBranch={selectedBranch}
              onSelect={onSelect}
              checkedOutBranch={checkedOutBranch}
              worktreeBranches={worktreeBranches}
              toneByWorktree={toneByWorktree}
              filledIcons={filledIcons}
              hideIdleIcons={hideIdleIcons}
              showWorktreeBadge={showWorktreeBadge}
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
      toneByWorktree,
      filledIcons,
      hideIdleIcons,
      showWorktreeBadge,
      onSelect,
      onActivate,
      onContextMenu,
    )
  }

  return null
}
