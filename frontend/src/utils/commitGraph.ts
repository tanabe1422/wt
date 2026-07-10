import type { GraphCommitItem } from '../components/git/graph/GitGraph'
import type { CommitLogEntry } from '../types'

export const COMMIT_ROW_HEIGHT = 26
export const GRAPH_NODE_RADIUS = 4

export function toGraphCommits(commits: CommitLogEntry[]): GraphCommitItem[] {
  return commits.map((commit) => ({
    id: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author.name,
    date: commit.commit.author.date,
    parents: commit.parents.map((parent) => parent.sha),
  }))
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function commitSubject(message: string): string {
  const line = message.split('\n')[0]?.trim()
  return line || '(no message)'
}

export function formatCommitDateYmd(value: string): string {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

export function formatCommitDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
