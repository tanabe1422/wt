import type {
  BranchEntry,
  BranchHead,
  CommitFileChange,
  CommitLogEntry,
  FileDiff,
  FileStatus,
  HistoryScope,
  ListCommitsResult,
  Settings,
  WorktreeEntry,
} from '../types'
import { localBranchFromRemote } from '../utils/branchTree'

export interface WailsApp {
  Ping(): Promise<string>
  GetSettings(): Promise<Settings>
  AddRepository(path: string): Promise<Settings>
  RemoveRepository(path: string): Promise<Settings>
  SetActiveRepository(path: string): Promise<Settings>
  PickDirectory(): Promise<string>
  ListBranches(repoPath: string): Promise<BranchEntry[]>
  ListWorktrees(repoPath: string): Promise<WorktreeEntry[]>
  DefaultWorktreePath(repoPath: string, branch: string): Promise<string>
  AddWorktree(
    repoPath: string,
    targetPath: string,
    branch: string,
    isRemote: boolean,
  ): Promise<string>
  GetStatus(worktreePath: string): Promise<FileStatus[]>
  GetFileDiff(worktreePath: string, file: string, staged: boolean): Promise<FileDiff>
  StageFiles(worktreePath: string, paths: string[]): Promise<void>
  UnstageFiles(worktreePath: string, paths: string[]): Promise<void>
  StageHunk(worktreePath: string, file: string, hunkIndex: number): Promise<void>
  UnstageHunk(worktreePath: string, file: string, hunkIndex: number): Promise<void>
  DiscardHunk(worktreePath: string, file: string, hunkIndex: number, staged: boolean): Promise<void>
  Commit(worktreePath: string, message: string): Promise<void>
  Fetch(worktreePath: string): Promise<void>
  Pull(worktreePath: string): Promise<void>
  Push(worktreePath: string): Promise<void>
  OpenMergetool(worktreePath: string, file: string): Promise<void>
  ListCommits(
    worktreePath: string,
    scope: string,
    branch: string,
    skip: number,
    limit: number,
  ): Promise<ListCommitsResult>
  ListBranchHeads(worktreePath: string): Promise<BranchHead[]>
  ListCommitFiles(worktreePath: string, sha: string): Promise<CommitFileChange[]>
  GetCommitFileDiff(worktreePath: string, sha: string, file: string): Promise<FileDiff>
  SwitchBranch(worktreePath: string, branch: string): Promise<void>
  CheckoutRemoteBranch(worktreePath: string, remoteRef: string): Promise<void>
  CreateBranch(worktreePath: string, name: string): Promise<void>
  DeleteBranch(worktreePath: string, name: string, force: boolean): Promise<void>
  MergeBranch(worktreePath: string, source: string): Promise<void>
  SquashMergeBranch(worktreePath: string, source: string): Promise<void>
  ResetToCommit(worktreePath: string, sha: string, mode: string): Promise<void>
}

declare global {
  interface Window {
    go?: {
      app: {
        App: WailsApp
      }
    }
  }
}

function isWailsRuntime(): boolean {
  return typeof window.go?.app?.App !== 'undefined'
}

let mockSettings: Settings = {
  repositories: [],
  activeRepository: '',
}

let mockStatus: FileStatus[] = [
  { path: 'src/main.go', index: 'M', workTree: ' ', staged: true, isDirectory: false },
  { path: 'README.md', index: ' ', workTree: 'M', staged: false, isDirectory: false },
  { path: 'config/app.json', index: '?', workTree: '?', staged: false, isDirectory: false },
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

function mockPaginateCommits(
  scope: string,
  branch: string,
  skip: number,
  limit: number,
): ListCommitsResult {
  const pageSize = limit > 0 ? limit : 50
  const source = mockCommitsForScope(scope, branch)
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
  { name: 'main', isCurrent: false, isRemote: false, aheadCount: 0, behindCount: 3 },
  { name: 'feature/hoge', isCurrent: true, isRemote: false, aheadCount: 23, behindCount: 0 },
  { name: 'feature/bar', isCurrent: false, isRemote: false, aheadCount: 0, behindCount: 5 },
  { name: 'bugfix/xyz', isCurrent: false, isRemote: false, aheadCount: 2, behindCount: 1 },
  { name: 'origin/main', isCurrent: false, isRemote: true, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/hoge', isCurrent: false, isRemote: true, aheadCount: 0, behindCount: 0 },
  { name: 'origin/feature/bar', isCurrent: false, isRemote: true, aheadCount: 0, behindCount: 0 },
]

let mockWorktreeList: WorktreeEntry[] = []

const mockApp: WailsApp = {
  async Ping() {
    console.info('[mock] Ping')
    return 'pong (mock)'
  },

  async GetSettings() {
    return { ...mockSettings, repositories: [...mockSettings.repositories] }
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
      throw new Error('選択したディレクトリは Git リポジトリではありません')
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

  async PickDirectory() {
    const path = window.prompt('Git リポジトリのパスを入力（モック）')
    return path?.trim() ?? ''
  },

  async ListBranches(_repoPath: string) {
    return mockBranchList.map((entry) => ({ ...entry }))
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
      throw new Error(`ブランチ「${localName}」は既にワークツリーでチェックアウトされています`)
    }
    if (mockWorktreeList.some((entry) => normalizePath(entry.path) === normalizePath(targetPath))) {
      throw new Error(`ディレクトリが既に存在します: ${targetPath}`)
    }
    if (isRemote && !mockBranchList.some((entry) => !entry.isRemote && entry.name === localName)) {
      mockBranchList = [
        ...mockBranchList,
        {
          name: localName,
          isCurrent: false,
          isRemote: false,
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

  async Commit(_worktreePath: string, message: string) {
    if (!message.trim()) {
      throw new Error('コミットメッセージを入力してください')
    }
    mockStatus = mockStatus.filter((entry) => !entry.staged)
  },

  async Fetch(_worktreePath: string) {
    console.info('[mock] Fetch')
  },

  async Pull(_worktreePath: string) {
    console.info('[mock] Pull')
  },

  async Push(_worktreePath: string) {
    console.info('[mock] Push')
  },

  async OpenMergetool(_worktreePath: string, file: string) {
    console.info('[mock] OpenMergetool', file)
  },

  async ListCommits(_worktreePath: string, scope: string, branch: string, skip: number, limit: number) {
    return mockPaginateCommits(scope, branch, skip, limit)
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

  async SwitchBranch(worktreePath: string, branch: string) {
    const worktree = mockWorktreeList.find((entry) => entry.path === worktreePath)
    if (!worktree) {
      throw new Error('ワークツリーが見つかりません')
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
      throw new Error('ブランチ名が空です')
    }
    const exists = mockBranchList.some(
      (entry) => !entry.isRemote && entry.name === trimmed,
    )
    if (exists) {
      throw new Error(`ブランチ '${trimmed}' は既に存在します`)
    }
    mockBranchList.push({
      name: trimmed,
      isCurrent: false,
      isRemote: false,
      aheadCount: 0,
      behindCount: 0,
    })
    await mockApp.SwitchBranch(worktreePath, trimmed)
    console.info('[mock] CreateBranch', trimmed)
  },

  async DeleteBranch(_worktreePath: string, name: string, force: boolean) {
    const current = mockBranchList.find((entry) => !entry.isRemote && entry.isCurrent)
    if (current?.name === name) {
      throw new Error('現在チェックアウト中のブランチは削除できません')
    }
    const index = mockBranchList.findIndex(
      (entry) => !entry.isRemote && entry.name === name,
    )
    if (index < 0) {
      throw new Error(`ブランチ '${name}' が見つかりません`)
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
      throw new Error('無効なリセットモードです')
    }
    console.info('[mock] ResetToCommit', sha, mode)
  },
}

async function callApp<T>(method: keyof WailsApp, ...args: unknown[]): Promise<T> {
  const wailsApp = window.go?.app?.App
  if (wailsApp) {
    const wailsFn = wailsApp[method]
    if (typeof wailsFn === 'function') {
      return (wailsFn as (...a: unknown[]) => Promise<T>).apply(wailsApp, args)
    }
    throw new Error(
      `API "${String(method)}" が利用できません。wails dev を再起動するか、アプリを再ビルドしてください。`,
    )
  }

  const mockFn = mockApp[method]
  if (typeof mockFn !== 'function') {
    throw new Error(`Mock API "${String(method)}" is not implemented`)
  }
  return (mockFn as (...a: unknown[]) => Promise<T>).apply(mockApp, args)
}

export async function ping(): Promise<string> {
  return callApp('Ping')
}

export async function getSettings(): Promise<Settings> {
  return callApp('GetSettings')
}

export async function addRepository(path: string): Promise<Settings> {
  return callApp('AddRepository', path)
}

export async function removeRepository(path: string): Promise<Settings> {
  return callApp('RemoveRepository', path)
}

export async function setActiveRepository(path: string): Promise<Settings> {
  return callApp('SetActiveRepository', path)
}

export async function pickDirectory(): Promise<string> {
  return callApp('PickDirectory')
}

export async function listBranches(repoPath = ''): Promise<BranchEntry[]> {
  return callApp('ListBranches', repoPath)
}

export async function listWorktrees(repoPath = ''): Promise<WorktreeEntry[]> {
  return callApp('ListWorktrees', repoPath)
}

export async function defaultWorktreePath(
  repoPath: string,
  branch: string,
): Promise<string> {
  return callApp('DefaultWorktreePath', repoPath, branch)
}

export async function addWorktree(
  repoPath: string,
  targetPath: string,
  branch: string,
  isRemote: boolean,
): Promise<string> {
  return callApp('AddWorktree', repoPath, targetPath, branch, isRemote)
}

export async function getStatus(worktreePath: string): Promise<FileStatus[]> {
  return callApp('GetStatus', worktreePath)
}

export async function getFileDiff(
  worktreePath: string,
  file: string,
  staged: boolean,
): Promise<FileDiff> {
  return callApp('GetFileDiff', worktreePath, file, staged)
}

export async function stageFiles(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('StageFiles', worktreePath, paths)
}

export async function unstageFiles(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('UnstageFiles', worktreePath, paths)
}

export async function stageHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
): Promise<void> {
  return callApp('StageHunk', worktreePath, file, hunkIndex)
}

export async function unstageHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
): Promise<void> {
  return callApp('UnstageHunk', worktreePath, file, hunkIndex)
}

export async function discardHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
  staged: boolean,
): Promise<void> {
  return callApp('DiscardHunk', worktreePath, file, hunkIndex, staged)
}

export async function commit(worktreePath: string, message: string): Promise<void> {
  return callApp('Commit', worktreePath, message)
}

export async function fetchRemote(worktreePath: string): Promise<void> {
  return callApp('Fetch', worktreePath)
}

export async function pull(worktreePath: string): Promise<void> {
  return callApp('Pull', worktreePath)
}

export async function push(worktreePath: string): Promise<void> {
  return callApp('Push', worktreePath)
}

export async function openMergetool(worktreePath: string, file: string): Promise<void> {
  return callApp('OpenMergetool', worktreePath, file)
}

export async function listCommits(
  worktreePath: string,
  scope: HistoryScope,
  branch: string,
  skip: number,
  limit: number,
): Promise<ListCommitsResult> {
  return callApp('ListCommits', worktreePath, scope, branch, skip, limit)
}

export async function listBranchHeads(worktreePath: string): Promise<BranchHead[]> {
  return callApp('ListBranchHeads', worktreePath)
}

export async function listCommitFiles(
  worktreePath: string,
  sha: string,
): Promise<CommitFileChange[]> {
  return callApp('ListCommitFiles', worktreePath, sha)
}

export async function getCommitFileDiff(
  worktreePath: string,
  sha: string,
  file: string,
): Promise<FileDiff> {
  return callApp('GetCommitFileDiff', worktreePath, sha, file)
}

export async function switchBranch(worktreePath: string, branch: string): Promise<void> {
  return callApp('SwitchBranch', worktreePath, branch)
}

export async function checkoutRemoteBranch(
  worktreePath: string,
  remoteRef: string,
): Promise<void> {
  return callApp('CheckoutRemoteBranch', worktreePath, remoteRef)
}

export async function createBranch(worktreePath: string, name: string): Promise<void> {
  return callApp('CreateBranch', worktreePath, name)
}

export async function deleteBranch(
  worktreePath: string,
  name: string,
  force: boolean,
): Promise<void> {
  return callApp('DeleteBranch', worktreePath, name, force)
}

export async function mergeBranch(worktreePath: string, source: string): Promise<void> {
  return callApp('MergeBranch', worktreePath, source)
}

export async function squashMergeBranch(
  worktreePath: string,
  source: string,
): Promise<void> {
  return callApp('SquashMergeBranch', worktreePath, source)
}

export async function resetToCommit(
  worktreePath: string,
  sha: string,
  mode: string,
): Promise<void> {
  return callApp('ResetToCommit', worktreePath, sha, mode)
}

export function isRunningInWails(): boolean {
  return isWailsRuntime()
}

export function isConflict(entry: FileStatus): boolean {
  if (entry.index === 'U' || entry.workTree === 'U') {
    return true
  }
  if (entry.index === 'A' && entry.workTree === 'A') {
    return true
  }
  if (entry.index === 'D' && entry.workTree === 'D') {
    return true
  }
  return false
}

export function hasStagedChange(entry: FileStatus): boolean {
  if (isConflict(entry)) {
    return false
  }
  return entry.index !== ' ' && entry.index !== '?'
}

export function hasUnstagedChange(entry: FileStatus): boolean {
  if (isConflict(entry)) {
    return true
  }
  if (entry.index === '?' && entry.workTree === '?') {
    return true
  }
  return entry.workTree !== ' '
}
