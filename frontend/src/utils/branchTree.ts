import type { BranchEntry } from '../types'

export type { BranchEntry }

export interface BranchTreeNode {
  name: string
  fullName?: string
  isCurrent?: boolean
  aheadCount?: number
  behindCount?: number
  children: BranchTreeNode[]
}

function insertBranch(
  nodes: BranchTreeNode[],
  segments: string[],
  fullName: string,
  isCurrent: boolean,
  aheadCount: number,
  behindCount: number,
): void {
  if (segments.length === 0) {
    return
  }

  const [head, ...rest] = segments
  let node = nodes.find((candidate) => candidate.name === head)
  if (!node) {
    node = { name: head, children: [] }
    nodes.push(node)
  }

  if (rest.length === 0) {
    node.fullName = fullName
    node.isCurrent = isCurrent
    node.aheadCount = aheadCount
    node.behindCount = behindCount
    return
  }

  insertBranch(node.children, rest, fullName, isCurrent, aheadCount, behindCount)
}

function sortNodes(nodes: BranchTreeNode[]): BranchTreeNode[] {
  return nodes
    .map((node) => ({ ...node, children: sortNodes(node.children) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildBranchTree(entries: BranchEntry[]): BranchTreeNode[] {
  const roots: BranchTreeNode[] = []

  for (const entry of entries) {
    const segments = entry.name.split('/').filter(Boolean)
    if (segments.length === 0) {
      continue
    }
    insertBranch(
      roots,
      segments,
      entry.name,
      entry.isCurrent,
      entry.aheadCount,
      entry.behindCount,
    )
  }

  return sortNodes(roots)
}

export function splitBranchTrees(entries: BranchEntry[]) {
  return {
    local: buildBranchTree(entries.filter((entry) => !entry.isRemote)),
    remote: buildBranchTree(entries.filter((entry) => entry.isRemote)),
  }
}

export function localBranchFromRemote(remoteRef: string): string {
  const slash = remoteRef.indexOf('/')
  if (slash < 0) {
    throw new Error('無効なリモートブランチ名です')
  }
  const localName = remoteRef.slice(slash + 1)
  if (!localName) {
    throw new Error('無効なリモートブランチ名です')
  }
  return localName
}
