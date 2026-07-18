import type {
  BranchEntry,
  BranchHead,
  CommitFileChange,
  CommitLogEntry,
  FileDiff,
  FileStatus,
  ListCommitsResult,
  RepoOperationState,
  Settings,
  StashEntry,
  WorktreeEntry,
} from '../../types'
import { localBranchFromRemote } from '../../utils/branchTree'
import { commitFileMatchesPathQuery } from '../../utils/commitSearchPath'
import type { WailsApp } from './types'

let mockSettings: Settings = {
  repositories: [],
  activeRepository: '',
  diffTool: { preset: 'custom', path: '', args: '' },
  mergeTool: { preset: 'custom', path: '', args: '' },
  openApps: [],
  remoteCleanupExcluded: ['main', 'master', 'develop'],
  pushAfterCommit: {},
  enableGitLogging: false,
}

let mockFsMonitorEnabled = false

let mockStatus: FileStatus[] = [
  { path: 'src/main.go', index: 'M', workTree: ' ', staged: true, isDirectory: false },
  { path: 'README.md', index: ' ', workTree: 'M', staged: false, isDirectory: false },
  { path: 'config/app.json', index: '?', workTree: '?', staged: false, isDirectory: false },
]

let mockRebasing = false

let mockStashList: StashEntry[] = [
  { index: 0, ref: 'stash@{0}', message: 'On feature/hoge: WIP before merge' },
  { index: 1, ref: 'stash@{1}', message: 'WIP on main: draft notes' },
]

const mockDiff: FileDiff = {
  path: 'README.md',
  hunks: [
    {
      header: '@@ -1,3 +1,4 @@',
      lines: [
        { kind: 'ctx', content: '# Sample', oldNo: 1, newNo: 1 },
        { kind: 'ctx', content: '', oldNo: 2, newNo: 2 },
        { kind: 'del', content: 'old line', oldNo: 3 },
        { kind: 'add', content: 'new line', newNo: 3 },
        { kind: 'ctx', content: 'footer', oldNo: 4, newNo: 4 },
      ],
    },
  ],
}

const mockStagedHunks = new Map<string, Set<number>>()
const mockDiscardedHunks = new Map<string, Set<number>>()

const SYNC_MOCK_DELAY_MS = 1200

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function updateCurrentBranchCounts(patch: Partial<Pick<BranchEntry, 'aheadCount' | 'behindCount' | 'hasUpstream'>>) {
  mockBranchList = mockBranchList.map((entry) =>
    entry.isCurrent && !entry.isRemote ? { ...entry, ...patch } : entry,
  )
}

/** Storybook 用: 現在ブランチの ahead/behind を初期化 */
export function seedMockSyncCounts(aheadCount: number, behindCount: number) {
  updateCurrentBranchCounts({ aheadCount, behindCount })
}

const mockCommitCatalog: CommitLogEntry[] = [
  {
    sha: 'c1000005',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T12:00:00+09:00' },
      message: 'merge feature/bar',
    },
    parents: [{ sha: 'c1000004' }, { sha: 'c1000003' }],
  },
  {
    sha: 'c1000004',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T11:00:00+09:00' },
      message: 'main: update docs',
    },
    parents: [{ sha: 'c1000002' }],
  },
  {
    sha: 'c1000003',
    commit: {
      author: { name: 'Bob', email: 'bob@example.com', date: '2026-07-07T10:30:00+09:00' },
      message: 'feature/bar: add panel',
    },
    parents: [{ sha: 'c1000002' }],
  },
  {
    sha: 'c1000002',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T10:00:00+09:00' },
      message: 'feat: scaffold history view',
    },
    parents: [{ sha: 'c1000001' }],
  },
  {
    sha: 'c1000001',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T09:00:00+09:00' },
      message: 'chore: initial commit',
    },
    parents: [],
  },
]

const mockBranchHeads: BranchHead[] = [
  { name: 'feature/hoge', commit: { sha: 'c1000004' } },
  { name: 'feature/bar', commit: { sha: 'c1000003' } },
  { name: 'origin/main', commit: { sha: 'c1000005' } },
  { name: 'v1.0.0', commit: { sha: 'c1000005' } },
]

function mockCommitsForScope(scope: string, branch: string): CommitLogEntry[] {
  if (scope === 'branch') {
    const target = branch || 'feature/hoge'
    if (target === 'feature/bar') {
      return mockCommitCatalog.filter((entry) =>
        ['c1000003', 'c1000002', 'c1000001'].includes(entry.sha),
      )
    }
    return mockCommitCatalog.filter((entry) =>
      ['c1000005', 'c1000004', 'c1000002', 'c1000001'].includes(entry.sha),
    )
  }
  return [...mockCommitCatalog]
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

function mockPaginateCommits(
  scope: string,
  branch: string,
  skip: number,
  limit: number,
  searchType = '',
  searchQuery = '',
): ListCommitsResult {
  const pageSize = limit > 0 ? limit : 50
  const source = filterMockCommits(mockCommitsForScope(scope, branch), searchType, searchQuery)
  const slice = source.slice(skip, skip + pageSize)
  const nextSkip = skip + slice.length
  return {
    commits: slice,
    hasMore: nextSkip < source.length,
    nextSkip,
  }
}

function mockCommitFilesForSha(sha: string): CommitFileChange[] {
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

function mockHunksForFile(file: string, staged: boolean) {
  const stagedSet = mockStagedHunks.get(file) ?? new Set<number>()
  const discardedSet = mockDiscardedHunks.get(file) ?? new Set<number>()
  if (file !== mockDiff.path) {
    return []
  }
  return mockDiff.hunks.filter(
    (_, index) =>
      !discardedSet.has(index) && (staged ? stagedSet.has(index) : !stagedSet.has(index)),
  )
}

function mockSyncStatusForFile(file: string) {
  if (file !== mockDiff.path) {
    return
  }
  const stagedSet = mockStagedHunks.get(file) ?? new Set<number>()
  const total = mockDiff.hunks.length
  const stagedCount = stagedSet.size

  mockStatus = mockStatus.map((entry) => {
    if (entry.path !== file) {
      return entry
    }
    if (stagedCount === 0) {
      return { path: file, index: ' ', workTree: 'M', staged: false, isDirectory: false }
    }
    if (stagedCount >= total) {
      return { path: file, index: 'M', workTree: ' ', staged: true, isDirectory: false }
    }
    return { path: file, index: 'M', workTree: 'M', staged: false, isDirectory: false }
  })
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

let mockBranchList: BranchEntry[] = [
  { name: 'main', isCurrent: false, isRemote: false, hasUpstream: true, aheadCount: 0, behindCount: 3 },
  { name: 'feature/hoge', isCurrent: true, isRemote: false, hasUpstream: true, aheadCount: 23, behindCount: 0 },
  { name: 'feature/bar', isCurrent: false, isRemote: false, hasUpstream: true, aheadCount: 0, behindCount: 5 },
  { name: 'bugfix/xyz', isCurrent: false, isRemote: false, hasUpstream: false, aheadCount: 2, behindCount: 1 },
  { name: 'origin/main', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/hoge', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/bar', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/old-merged', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/squash-done', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
]

let mockWorktreeList: WorktreeEntry[] = []

export const mockApp: WailsApp = {
  async Ping() {
    console.info('[mock] Ping')
    return 'pong (mock)'
  },

  async GetSettings() {
    return {
      ...mockSettings,
      repositories: [...mockSettings.repositories],
      diffTool: { ...mockSettings.diffTool },
      mergeTool: { ...mockSettings.mergeTool },
      openApps: (mockSettings.openApps ?? []).map((app) => ({ ...app })),
      remoteCleanupExcluded: [...(mockSettings.remoteCleanupExcluded ?? [])],
      pushAfterCommit: { ...(mockSettings.pushAfterCommit ?? {}) },
      enableGitLogging: mockSettings.enableGitLogging ?? false,
    }
  },

  async SaveSettings(settings: Settings) {
    mockSettings = {
      ...mockSettings,
      diffTool: { ...settings.diffTool },
      mergeTool: { ...settings.mergeTool },
      openApps: (settings.openApps ?? []).map((app) => ({ ...app })),
      remoteCleanupExcluded: [...(settings.remoteCleanupExcluded ?? [])],
      pushAfterCommit: { ...(mockSettings.pushAfterCommit ?? {}) },
      enableGitLogging: settings.enableGitLogging ?? false,
    }
    return mockApp.GetSettings()
  },

  async AddRepository(path: string) {
    const normalized = normalizePath(path)
    if (!normalized) {
      return mockApp.GetSettings()
    }

    const isGitRepo =
      normalized.endsWith('.git') ||
      /\/\.git$/.test(normalized) ||
      normalized.toLowerCase().includes('git')

    if (!isGitRepo) {
      throw new Error('??????????? Git ????????????')
    }

    const exists = mockSettings.repositories.some(
      (repo) => normalizePath(repo) === normalized,
    )
    if (!exists) {
      mockSettings.repositories = [...mockSettings.repositories, path]
    }
    mockSettings.activeRepository = path
    return mockApp.GetSettings()
  },

  async RemoveRepository(path: string) {
    const normalized = normalizePath(path)
    mockSettings.repositories = mockSettings.repositories.filter(
      (repo) => normalizePath(repo) !== normalized,
    )
    if (normalizePath(mockSettings.activeRepository) === normalized) {
      mockSettings.activeRepository = mockSettings.repositories[0] ?? ''
    }
    return mockApp.GetSettings()
  },

  async SetActiveRepository(path: string) {
    const normalized = normalizePath(path)
    if (mockSettings.repositories.some((repo) => normalizePath(repo) === normalized)) {
      mockSettings.activeRepository = path
    }
    return mockApp.GetSettings()
  },

  async SetPushAfterCommit(repoPath: string, enabled: boolean) {
    const normalized = normalizePath(repoPath)
    if (!normalized) {
      return mockApp.GetSettings()
    }
    if (!mockSettings.pushAfterCommit) {
      mockSettings.pushAfterCommit = {}
    }
    if (enabled) {
      mockSettings.pushAfterCommit[normalized] = true
    } else {
      delete mockSettings.pushAfterCommit[normalized]
    }
    return mockApp.GetSettings()
  },

  async GetFsMonitor(_repoPath: string) {
    return { supported: true, enabled: mockFsMonitorEnabled }
  },

  async SetFsMonitor(_repoPath: string, enabled: boolean) {
    mockFsMonitorEnabled = enabled
    return { supported: true, enabled: mockFsMonitorEnabled }
  },

  async GetGitLogsDir() {
    return 'C:/Users/mock/AppData/Roaming/wt-manager/logs'
  },

  async GetGitDebugSnapshot() {
    return {
      inflight: [
        {
          id: 1,
          dir: 'C:/dev/sample-repo',
          args: ['status', '--porcelain=v1', '-u'],
          startedAt: Date.now() - 1200,
        },
      ],
      recent: [
        {
          dir: 'C:/dev/sample-repo',
          args: ['rev-list', '--left-right', '--count', 'main@{upstream}...main'],
          startedAt: Date.now() - 5000,
          endedAt: Date.now() - 4800,
          durationMs: 200,
          error: '',
        },
        {
          dir: 'C:/dev/sample-repo',
          args: ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'],
          startedAt: Date.now() - 8000,
          endedAt: Date.now() - 7900,
          durationMs: 100,
          error: '',
        },
      ],
      lastMinuteCount: 12,
    }
  },

  async OpenGitLogsDir() {
    console.info('[mock] OpenGitLogsDir')
  },

  async PickDirectory() {
    const path = window.prompt('Git ????????????????')
    return path?.trim() ?? ''
  },

  async PickFile() {
    const path = window.prompt('?????????????????')
    return path?.trim() ?? ''
  },

  async ShowInExplorer(path: string) {
    console.info('[mock] ShowInExplorer', path)
  },

  async OpenTerminal(path: string) {
    console.info('[mock] OpenTerminal', path)
  },

  async OpenInApp(appID: string, dirPath: string) {
    const app = (mockSettings.openApps ?? []).find((entry) => entry.id === appID)
    if (!app) {
      throw new Error(`登録アプリが見つかりません: ${appID}`)
    }
    console.info('[mock] OpenInApp', app.name, dirPath)
  },

  async GetExecutableIconDataURL(commandOrPath: string) {
    console.info('[mock] GetExecutableIconDataURL', commandOrPath)
    // 1x1 transparent PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  },

  async ListBranches(_repoPath: string) {
    return mockBranchList.map((entry) => ({
      ...entry,
      // ListBranches only fills current-branch track (matches Go).
      aheadCount: entry.isCurrent ? entry.aheadCount : 0,
      behindCount: entry.isCurrent ? entry.behindCount : 0,
    }))
  },

  async GetBranchAheadBehind(_repoPath: string, branch: string) {
    const entry = mockBranchList.find((item) => item.name === branch && !item.isRemote)
    return { ahead: entry?.aheadCount ?? 0, behind: entry?.behindCount ?? 0 }
  },

  async ListWorktrees(repoPath: string) {
    const root = repoPath || mockSettings.activeRepository || 'C:/dev/sample-repo'
    if (mockWorktreeList.length === 0) {
      mockWorktreeList = [
        {
          path: root,
          branch: 'feature/hoge',
          isMain: true,
          isBare: false,
          isLocked: false,
          changedFileCount: mockStatus.length,
        },
        {
          path: `${root}-wt-feature-bar`,
          branch: 'feature/bar',
          isMain: false,
          isBare: false,
          isLocked: false,
          changedFileCount: 0,
        },
      ]
    } else {
      mockWorktreeList = mockWorktreeList.map((entry) => ({
        ...entry,
        changedFileCount:
          entry.path === root || entry.isMain ? mockStatus.length : entry.changedFileCount,
      }))
    }
    return mockWorktreeList.map((entry) => ({ ...entry }))
  },

  async ListWorktreesMeta(repoPath: string) {
    const entries = await mockApp.ListWorktrees(repoPath)
    return entries.map((entry) => ({ ...entry, changedFileCount: 0 }))
  },

  async GetWorktreeChangedCount(worktreePath: string) {
    const root = mockSettings.activeRepository || 'C:/dev/sample-repo'
    if (worktreePath === root || normalizePath(worktreePath) === normalizePath(root)) {
      return mockStatus.length
    }
    const entry = mockWorktreeList.find(
      (item) => normalizePath(item.path) === normalizePath(worktreePath),
    )
    return entry?.changedFileCount ?? 0
  },

  async DefaultWorktreePath(repoPath: string, branch: string) {
    const root = repoPath || mockSettings.activeRepository || 'C:/dev/sample-repo'
    const parent = root.replace(/[/\\][^/\\]+$/, '')
    const leaf = branch.replace(/\//g, '/')
    let candidate = `${parent}/${leaf}`
    let n = 2
    while (mockWorktreeList.some((entry) => normalizePath(entry.path) === normalizePath(candidate))) {
      const base = leaf.includes('/') ? leaf.slice(leaf.lastIndexOf('/') + 1) : leaf
      const dir = leaf.includes('/') ? leaf.slice(0, leaf.lastIndexOf('/')) : ''
      candidate = dir
        ? `${parent}/${dir}/${base}-${n}`
        : `${parent}/${base}-${n}`
      n += 1
    }
    return candidate
  },

  async AddWorktree(
    repoPath: string,
    targetPath: string,
    branch: string,
    isRemote: boolean,
  ) {
    await mockApp.ListWorktrees(repoPath)
    const localName = isRemote ? localBranchFromRemote(branch) : branch
    if (mockWorktreeList.some((entry) => entry.branch === localName)) {
      throw new Error(`?????${localName}????????????????????????`)
    }
    if (mockWorktreeList.some((entry) => normalizePath(entry.path) === normalizePath(targetPath))) {
      throw new Error(`??????????????: ${targetPath}`)
    }
    if (isRemote && !mockBranchList.some((entry) => !entry.isRemote && entry.name === localName)) {
      mockBranchList = [
        ...mockBranchList,
        {
          name: localName,
          isCurrent: false,
          isRemote: false,
          hasUpstream: false,
          aheadCount: 0,
          behindCount: 0,
        },
      ]
    }
    mockWorktreeList = [
      ...mockWorktreeList,
      {
        path: targetPath,
        branch: localName,
        isMain: false,
        isBare: false,
        isLocked: false,
        changedFileCount: 0,
      },
    ]
    return targetPath
  },

  async RemoveWorktree(_repoPath: string, worktreePath: string, _force: boolean) {
    const target = mockWorktreeList.find((entry) => entry.path === worktreePath)
    if (!target) {
      throw new Error(`??????????????: ${worktreePath}`)
    }
    if (target.isMain) {
      throw new Error('??????????????????')
    }
    mockWorktreeList = mockWorktreeList.filter((entry) => entry.path !== worktreePath)
  },

  async GetStatus(_worktreePath: string) {
    return [...mockStatus]
  },

  async GetFileDiff(_worktreePath: string, file: string, staged: boolean) {
    return { path: file, hunks: mockHunksForFile(file, staged) }
  },

  async StageFiles(_worktreePath: string, paths: string[]) {
    for (const path of paths) {
      if (path === mockDiff.path) {
        mockStagedHunks.set(
          path,
          new Set(mockDiff.hunks.map((_, index) => index)),
        )
      }
    }
    mockStatus = mockStatus.map((entry) => {
      if (!paths.includes(entry.path)) {
        return entry
      }
      if (entry.index === '?' && entry.workTree === '?') {
        return { ...entry, index: 'A', workTree: ' ', staged: true }
      }
      return {
        ...entry,
        index: entry.workTree !== ' ' ? entry.workTree : 'M',
        workTree: ' ',
        staged: true,
      }
    })
  },

  async StageAll(worktreePath: string) {
    const paths = mockStatus
      .filter((entry) => {
        const conflict =
          entry.index === 'U' ||
          entry.workTree === 'U' ||
          (entry.index === 'A' && entry.workTree === 'A') ||
          (entry.index === 'D' && entry.workTree === 'D')
        if (conflict) {
          return false
        }
        return entry.index === '?' || entry.workTree !== ' '
      })
      .map((entry) => entry.path)
    await this.StageFiles(worktreePath, paths)
  },

  async UnstageFiles(_worktreePath: string, paths: string[]) {
    mockStatus = mockStatus
      .map((entry) => {
        if (!paths.includes(entry.path)) {
          return entry
        }
        mockStagedHunks.delete(entry.path)
        if (entry.index === 'A') {
          return { ...entry, index: '?', workTree: '?', staged: false }
        }
        return {
          ...entry,
          index: ' ',
          workTree: entry.index !== ' ' ? entry.index : 'M',
          staged: false,
        }
      })
      .filter((entry) => entry.index !== ' ' || entry.workTree !== ' ')
  },

  async UnstageAll(worktreePath: string) {
    const paths = mockStatus
      .filter((entry) => entry.index !== ' ' && entry.index !== '?')
      .map((entry) => entry.path)
    await this.UnstageFiles(worktreePath, paths)
  },

  async StageHunk(_worktreePath: string, file: string, hunkIndex: number) {
    const stagedSet = mockStagedHunks.get(file) ?? new Set<number>()
    stagedSet.add(hunkIndex)
    mockStagedHunks.set(file, stagedSet)
    mockSyncStatusForFile(file)
  },

  async UnstageHunk(_worktreePath: string, file: string, hunkIndex: number) {
    mockStagedHunks.get(file)?.delete(hunkIndex)
    mockSyncStatusForFile(file)
  },

  async DiscardHunk(_worktreePath: string, file: string, hunkIndex: number, _staged: boolean) {
    const discardedSet = mockDiscardedHunks.get(file) ?? new Set<number>()
    discardedSet.add(hunkIndex)
    mockDiscardedHunks.set(file, discardedSet)
    mockStagedHunks.get(file)?.delete(hunkIndex)
    mockSyncStatusForFile(file)
  },

  async StageLines(_worktreePath: string, file: string, hunkIndex: number, _lineIndices: number[]) {
    await this.StageHunk(_worktreePath, file, hunkIndex)
  },

  async UnstageLines(_worktreePath: string, file: string, hunkIndex: number, _lineIndices: number[]) {
    await this.UnstageHunk(_worktreePath, file, hunkIndex)
  },

  async DiscardLines(
    _worktreePath: string,
    file: string,
    hunkIndex: number,
    _lineIndices: number[],
    staged: boolean,
  ) {
    await this.DiscardHunk(_worktreePath, file, hunkIndex, staged)
  },

  async DiscardFiles(_worktreePath: string, paths: string[]) {
    mockStatus = mockStatus
      .map((entry) => {
        if (!paths.includes(entry.path)) {
          return entry
        }
        if (entry.index === '?' && entry.workTree === '?') {
          return entry
        }
        mockDiscardedHunks.delete(entry.path)
        mockStagedHunks.delete(entry.path)
        return {
          ...entry,
          workTree: ' ',
          staged: entry.index !== ' ' && entry.index !== '?',
        }
      })
      .filter((entry) => entry.index !== ' ' || entry.workTree !== ' ')
  },

  async DeleteUntracked(_worktreePath: string, paths: string[]) {
    mockStatus = mockStatus.filter(
      (entry) => !(paths.includes(entry.path) && entry.index === '?' && entry.workTree === '?'),
    )
  },

  async DiscardAllChanges(_worktreePath: string) {
    mockStatus = []
    mockDiscardedHunks.clear()
    mockStagedHunks.clear()
  },

  async AbortMerge(_worktreePath: string) {
    mockStatus = mockStatus.filter((entry) => !(
      entry.index === 'U' ||
      entry.workTree === 'U' ||
      (entry.index === 'A' && entry.workTree === 'A') ||
      (entry.index === 'D' && entry.workTree === 'D')
    ))
    console.info('[mock] AbortMerge')
  },

  async AbortRebase(_worktreePath: string) {
    mockRebasing = false
    mockStatus = mockStatus.filter((entry) => !(
      entry.index === 'U' ||
      entry.workTree === 'U' ||
      (entry.index === 'A' && entry.workTree === 'A') ||
      (entry.index === 'D' && entry.workTree === 'D')
    ))
    console.info('[mock] AbortRebase')
  },

  async IsMerging(_worktreePath: string) {
    if (mockRebasing) {
      return false
    }
    return mockStatus.some(
      (entry) =>
        entry.index === 'U' ||
        entry.workTree === 'U' ||
        (entry.index === 'A' && entry.workTree === 'A') ||
        (entry.index === 'D' && entry.workTree === 'D'),
    )
  },

  async IsRebasing(_worktreePath: string) {
    return mockRebasing
  },

  async GetRepoOperationState(_worktreePath: string): Promise<RepoOperationState> {
    if (mockRebasing) {
      return { kind: 'rebase' }
    }
    if (await this.IsMerging(_worktreePath)) {
      return { kind: 'merge' }
    }
    return { kind: 'none' }
  },

  async ContinueRebase(_worktreePath: string) {
    mockRebasing = false
    console.info('[mock] ContinueRebase')
  },

  async RebaseBranch(_worktreePath: string, upstream: string) {
    if (!upstream.trim()) {
      throw new Error('ブランチ名が空です')
    }
    if (mockStatus.length > 0) {
      throw new Error('未コミットの変更があります。コミットするかスタッシュしてからリベースしてください。')
    }
    console.info('[mock] RebaseBranch', upstream)
  },

  async Commit(_worktreePath: string, message: string) {
    if (!message.trim()) {
      throw new Error('??????????????????')
    }
    mockStatus = mockStatus.filter((entry) => !entry.staged)
  },

  async GetAmendInfo(_worktreePath: string) {
    const current = mockBranchList.find((entry) => entry.isCurrent && !entry.isRemote)
    const ahead = current?.aheadCount ?? 0
    const hasUpstream = current?.hasUpstream ?? false
    const merging = await this.IsMerging(_worktreePath)
    const rebasing = await this.IsRebasing(_worktreePath)
    if (merging) {
      return {
        canAmend: false,
        reason: 'マージ中は修正できません',
        headMessage: 'mock tip commit',
      }
    }
    if (rebasing) {
      return {
        canAmend: false,
        reason: 'リベース中は修正できません',
        headMessage: 'mock tip commit',
      }
    }
    if (hasUpstream && ahead === 0) {
      return {
        canAmend: false,
        reason: '???????????',
        headMessage: 'mock tip commit',
      }
    }
    return {
      canAmend: true,
      reason: '',
      headMessage: 'mock tip commit',
    }
  },

  async AmendCommit(_worktreePath: string, message: string) {
    const info = await this.GetAmendInfo(_worktreePath)
    if (!info.canAmend) {
      throw new Error(info.reason || '????????????')
    }
    if (!message.trim()) {
      throw new Error('??????????????????')
    }
    mockStatus = mockStatus.filter((entry) => !entry.staged)
  },

  async Fetch(_worktreePath: string) {
    console.info('[mock] Fetch')
    await delay(SYNC_MOCK_DELAY_MS)
  },

  async FetchCurrentUpstream(_worktreePath: string) {
    console.info('[mock] FetchCurrentUpstream')
    await delay(400)
    updateCurrentBranchCounts({ behindCount: 0 })
  },

  async FetchPrune(_worktreePath: string) {
    console.info('[mock] FetchPrune')
    return [] as string[]
  },

  async Pull(_worktreePath: string) {
    console.info('[mock] Pull')
    await delay(SYNC_MOCK_DELAY_MS)
    updateCurrentBranchCounts({ behindCount: 0 })
  },

  async PullRebase(_worktreePath: string) {
    console.info('[mock] PullRebase')
    await delay(SYNC_MOCK_DELAY_MS)
    updateCurrentBranchCounts({ behindCount: 0 })
  },

  async Push(_worktreePath: string) {
    console.info('[mock] Push')
    await delay(SYNC_MOCK_DELAY_MS)
    updateCurrentBranchCounts({ aheadCount: 0 })
  },

  async PushSetUpstream(_worktreePath: string, remote: string) {
    const name = remote.trim() || 'origin'
    console.info('[mock] PushSetUpstream', name)
    await delay(SYNC_MOCK_DELAY_MS)
    updateCurrentBranchCounts({ hasUpstream: true, aheadCount: 0 })
  },

  async OpenMergetool(_worktreePath: string, file: string) {
    console.info('[mock] OpenMergetool', file, mockSettings.mergeTool)
    if (!mockSettings.mergeTool.path.trim()) {
      throw new Error('??????????????????????????????????????')
    }
  },

  async OpenDifftool(_worktreePath: string, file: string, staged: boolean) {
    console.info('[mock] OpenDifftool', file, staged, mockSettings.diffTool)
    if (!mockSettings.diffTool.path.trim()) {
      throw new Error('??????????????????????????????????????')
    }
  },

  async OpenCommitDifftool(_worktreePath: string, sha: string, file: string) {
    console.info('[mock] OpenCommitDifftool', sha, file, mockSettings.diffTool)
    if (!mockSettings.diffTool.path.trim()) {
      throw new Error(
        '外部ツールが設定されていません。設定画面でアプリと開き方を設定してください。',
      )
    }
  },

  async OpenRangeDifftool(
    _worktreePath: string,
    fromRef: string,
    toRef: string,
    file: string,
  ) {
    console.info('[mock] OpenRangeDifftool', fromRef, toRef, file, mockSettings.diffTool)
    if (!mockSettings.diffTool.path.trim()) {
      throw new Error(
        '外部ツールが設定されていません。設定画面でアプリと開き方を設定してください。',
      )
    }
  },

  async ListCommits(
    _worktreePath: string,
    scope: string,
    branch: string,
    skip: number,
    limit: number,
    searchType = '',
    searchQuery = '',
  ) {
    return mockPaginateCommits(scope, branch, skip, limit, searchType, searchQuery)
  },

  async ListBranchHeads(_worktreePath: string) {
    return [...mockBranchHeads]
  },

  async ListCommitFiles(_worktreePath: string, sha: string) {
    return mockCommitFilesForSha(sha)
  },

  async GetCommitFileDiff(_worktreePath: string, _sha: string, file: string) {
    return { path: file, hunks: mockDiff.hunks }
  },

  async ListRangeFiles(_worktreePath: string, _fromRef: string, _toRef: string) {
    return [
      { path: 'src/App.tsx', status: 'M' },
      { path: 'README.md', status: 'M' },
    ]
  },

  async GetRangeFileDiff(
    _worktreePath: string,
    _fromRef: string,
    _toRef: string,
    file: string,
  ) {
    return { path: file, hunks: mockDiff.hunks }
  },

  async SwitchBranch(worktreePath: string, branch: string) {
    const worktree = mockWorktreeList.find((entry) => entry.path === worktreePath)
    if (!worktree) {
      throw new Error('??????????????')
    }
    mockBranchList = mockBranchList.map((entry) => ({
      ...entry,
      isCurrent: !entry.isRemote && entry.name === branch,
    }))
    worktree.branch = branch
    console.info('[mock] SwitchBranch', branch)
  },

  async CheckoutRemoteBranch(worktreePath: string, remoteRef: string) {
    const localName = localBranchFromRemote(remoteRef)
    const exists = mockBranchList.some(
      (entry) => !entry.isRemote && entry.name === localName,
    )
    if (!exists) {
      mockBranchList.push({
        name: localName,
        isCurrent: false,
        isRemote: false,
        hasUpstream: false,
        aheadCount: 0,
        behindCount: 0,
      })
    }
    await mockApp.SwitchBranch(worktreePath, localName)
    console.info('[mock] CheckoutRemoteBranch', remoteRef)
  },

  async CreateBranch(worktreePath: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('?????????')
    }
    const exists = mockBranchList.some(
      (entry) => !entry.isRemote && entry.name === trimmed,
    )
    if (exists) {
      throw new Error(`???? '${trimmed}' ????????`)
    }
    mockBranchList.push({
      name: trimmed,
      isCurrent: false,
      isRemote: false,
      hasUpstream: false,
      aheadCount: 0,
      behindCount: 0,
    })
    await mockApp.SwitchBranch(worktreePath, trimmed)
    console.info('[mock] CreateBranch', trimmed)
  },

  async DeleteBranch(_worktreePath: string, name: string, force: boolean) {
    const current = mockBranchList.find((entry) => !entry.isRemote && entry.isCurrent)
    if (current?.name === name) {
      throw new Error('???????????????????????')
    }
    const index = mockBranchList.findIndex(
      (entry) => !entry.isRemote && entry.name === name,
    )
    if (index < 0) {
      throw new Error(`???? '${name}' ????????`)
    }
    if (!force) {
      const entry = mockBranchList[index]
      if (entry.aheadCount > 0) {
        throw new Error(`error: the branch '${name}' is not fully merged`)
      }
    }
    mockBranchList.splice(index, 1)
    console.info('[mock] DeleteBranch', name, force)
  },

  async DefaultRemoteBaseRef(_worktreePath: string) {
    const remotes = mockBranchList.filter((entry) => entry.isRemote).map((entry) => entry.name)
    if (remotes.includes('origin/main')) {
      return 'origin/main'
    }
    if (remotes.includes('origin/master')) {
      return 'origin/master'
    }
    if (remotes.length === 0) {
      throw new Error('リモートブランチが見つかりません')
    }
    return remotes[0]
  },

  async ListRemoteMergeStatus(_worktreePath: string, baseRef: string, mode: string) {
    const ancestryMerged = new Set([
      'origin/feature/bar',
      'origin/feature/old-merged',
    ])
    const contentMerged = new Set([
      ...ancestryMerged,
      'origin/feature/squash-done',
    ])
    const dates: Record<string, string> = {
      'origin/feature/hoge': '2026-07-12T18:30:00+09:00',
      'origin/feature/bar': '2026-06-20T11:00:00+09:00',
      'origin/feature/old-merged': '2026-03-01T09:15:00+09:00',
      'origin/feature/squash-done': '2026-05-15T14:45:00+09:00',
    }
    const authors: Record<string, string> = {
      'origin/feature/hoge': 'Alice',
      'origin/feature/bar': 'Bob',
      'origin/feature/old-merged': 'Carol',
      'origin/feature/squash-done': 'Dave',
    }
    const mergedSet = mode === 'content' ? contentMerged : ancestryMerged
    return mockBranchList
      .filter((entry) => entry.isRemote && entry.name !== baseRef)
      .map((entry) => ({
        name: entry.name,
        merged: mergedSet.has(entry.name),
        lastCommitAt: dates[entry.name] ?? '2026-01-01T00:00:00+09:00',
        lastAuthor: authors[entry.name] ?? 'Unknown',
      }))
      .sort((a, b) => a.lastCommitAt.localeCompare(b.lastCommitAt) || a.name.localeCompare(b.name))
  },

  async DeleteRemoteBranches(_worktreePath: string, remoteRefs: string[]) {
    if (remoteRefs.length === 0) {
      throw new Error('削除するブランチがありません')
    }
    for (const ref of remoteRefs) {
      if (ref.endsWith('/HEAD')) {
        throw new Error('リモート HEAD は削除できません')
      }
      const index = mockBranchList.findIndex((entry) => entry.isRemote && entry.name === ref)
      if (index < 0) {
        throw new Error(`リモートブランチ '${ref}' が見つかりません`)
      }
      mockBranchList.splice(index, 1)
    }
    console.info('[mock] DeleteRemoteBranches', remoteRefs)
  },

  async RenameBranch(_worktreePath: string, oldName: string, newName: string) {
    const trimmedOld = oldName.trim()
    const trimmedNew = newName.trim()
    if (!trimmedOld || !trimmedNew) {
      throw new Error('?????????')
    }
    if (trimmedOld === trimmedNew) {
      return
    }
    const index = mockBranchList.findIndex(
      (entry) => !entry.isRemote && entry.name === trimmedOld,
    )
    if (index < 0) {
      throw new Error(`???? '${trimmedOld}' ????????`)
    }
    if (mockBranchList.some((entry) => !entry.isRemote && entry.name === trimmedNew)) {
      throw new Error(`???? '${trimmedNew}' ????????`)
    }
    mockBranchList[index] = { ...mockBranchList[index], name: trimmedNew }
    mockWorktreeList = mockWorktreeList.map((worktree) =>
      worktree.branch === trimmedOld ? { ...worktree, branch: trimmedNew } : worktree,
    )
    console.info('[mock] RenameBranch', trimmedOld, trimmedNew)
  },

  async MergeBranch(_worktreePath: string, source: string) {
    console.info('[mock] MergeBranch', source)
  },

  async SquashMergeBranch(_worktreePath: string, source: string) {
    mockStatus = [
      ...mockStatus,
      {
        path: `squash-from-${source.replace(/\//g, '-')}.txt`,
        index: 'A',
        workTree: ' ',
        staged: true,
        isDirectory: false,
      },
    ]
    console.info('[mock] SquashMergeBranch', source)
  },

  async ResetToCommit(_worktreePath: string, sha: string, mode: string) {
    if (mode !== 'soft' && mode !== 'mixed' && mode !== 'hard') {
      throw new Error('invalid reset mode')
    }
    console.info('[mock] ResetToCommit', sha, mode)
  },

  async ListStashes(_worktreePath: string) {
    return mockStashList.map((entry) => ({ ...entry }))
  },

  async SaveStash(_worktreePath: string, message: string, includeUntracked: boolean) {
    const msg = message.trim() || 'WIP'
    mockStashList = [
      {
        index: 0,
        ref: 'stash@{0}',
        message: `On mock: ${msg}`,
      },
      ...mockStashList.map((entry, i) => ({
        ...entry,
        index: i + 1,
        ref: `stash@{${i + 1}}`,
      })),
    ]
    mockStatus = includeUntracked
      ? []
      : mockStatus.filter((entry) => entry.index === '?' || entry.workTree === '?')
    console.info('[mock] SaveStash', message, includeUntracked)
  },

  async ApplyStash(_worktreePath: string, index: number) {
    const entry = mockStashList.find((item) => item.index === index)
    if (!entry) {
      throw new Error(`stash@{${index}} ????????`)
    }
    mockStatus = [
      ...mockStatus,
      {
        path: `stash-applied-${index}.txt`,
        index: ' ',
        workTree: 'M',
        staged: false,
        isDirectory: false,
      },
    ]
    console.info('[mock] ApplyStash', index)
  },

  async PopStash(worktreePath: string, index: number) {
    await mockApp.ApplyStash(worktreePath, index)
    await mockApp.DropStash(worktreePath, index)
    console.info('[mock] PopStash', index)
  },

  async DropStash(_worktreePath: string, index: number) {
    if (!mockStashList.some((entry) => entry.index === index)) {
      throw new Error(`stash@{${index}} ????????`)
    }
    mockStashList = mockStashList
      .filter((entry) => entry.index !== index)
      .map((entry, i) => ({
        ...entry,
        index: i,
        ref: `stash@{${i}}`,
      }))
    console.info('[mock] DropStash', index)
  },
}
