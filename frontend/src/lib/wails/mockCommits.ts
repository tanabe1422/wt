import type { CommitFileChange, CommitLogEntry } from '../../types'
import { commitFileMatchesPathQuery } from '../../utils/commitSearchPath'

export function mockCommitFilesForSha(sha: string): CommitFileChange[] {
  switch (sha) {
    case 'c1000005':
      return [
        { path: 'src/panel.tsx', status: 'M' },
        { path: 'README.md', status: 'M' },
      ]
    case 'c1000004':
      return [
        { path: 'docs/guide.md', status: 'M' },
        { path: 'docs/api.md', oldPath: 'docs/old-api.md', status: 'R' },
      ]
    case 'c1000003':
      return [
        { path: 'src/panel.tsx', status: 'A' },
        { path: 'src/panel.module.css', status: 'A' },
      ]
    case 'c1000002':
      return [
        { path: 'frontend/src/components/git/HistoryView.tsx', status: 'A' },
        { path: 'frontend/src/hooks/useCommitHistory.ts', status: 'A' },
      ]
    case 'c1000001':
      return [
        { path: 'README.md', status: 'A' },
        { path: 'go.mod', status: 'A' },
      ]
    default:
      return [{ path: 'README.md', status: 'M' }]
  }
}

/** Exported for Vitest — filters commits the same way as mock ListCommits. */
export function filterMockCommits(
  commits: CommitLogEntry[],
  searchType: string,
  searchQuery: string,
): CommitLogEntry[] {
  const q = searchQuery.trim()
  if (!q) {
    return commits
  }
  const lower = q.toLowerCase()
  switch (searchType) {
    case 'message':
      return commits.filter((entry) => entry.commit.message.toLowerCase().includes(lower))
    case 'author':
      return commits.filter(
        (entry) =>
          entry.commit.author.name.toLowerCase().includes(lower) ||
          entry.commit.author.email?.toLowerCase().includes(lower),
      )
    case 'path':
      return commits.filter((entry) =>
        mockCommitFilesForSha(entry.sha).some((file) => commitFileMatchesPathQuery(file, q)),
      )
    case 'sha':
      return commits.filter((entry) => entry.sha.toLowerCase().startsWith(lower)).slice(0, 1)
    default:
      return commits
  }
}
