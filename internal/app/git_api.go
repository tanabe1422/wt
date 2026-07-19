package app

import (
	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

func (a *App) ListBranches(repoPath string) ([]git.BranchEntry, error) {
	root, ok, err := tryResolveRepoRoot(repoPath)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []git.BranchEntry{}, nil
	}
	return branchesReadCache.getOrLoad(root, func() ([]git.BranchEntry, error) {
		return git.ListBranches(root)
	})
}

func (a *App) GetBranchAheadBehind(repoPath, branch string) (git.AheadBehind, error) {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return git.AheadBehind{}, err
	}
	return git.GetBranchAheadBehind(repoRoot, branch)
}

func (a *App) ListWorktrees(repoPath string) ([]git.WorktreeEntry, error) {
	return listFromRepo(repoPath, git.ListWorktrees)
}

func (a *App) ListWorktreesMeta(repoPath string) ([]git.WorktreeEntry, error) {
	root, ok, err := tryResolveRepoRoot(repoPath)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []git.WorktreeEntry{}, nil
	}
	return worktreesReadCache.getOrLoad(root, func() ([]git.WorktreeEntry, error) {
		return git.ListWorktreesMeta(root)
	})
}

func (a *App) GetWorktreeChangedCount(worktreePath string) (int, error) {
	return withWorktreeResult(worktreePath, git.GetWorktreeChangedCount)
}

func (a *App) DefaultWorktreePath(repoPath, branch string) (string, error) {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return "", err
	}
	return git.DefaultWorktreePath(repoRoot, branch)
}

func (a *App) AddWorktree(repoPath, targetPath, branch string, isRemote bool) (string, error) {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return "", err
	}
	clearGitReadCaches()
	return git.AddWorktree(repoRoot, targetPath, branch, isRemote)
}

func (a *App) RemoveWorktree(repoPath, worktreePath string, force bool) error {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return err
	}
	clearGitReadCaches()
	return git.RemoveWorktree(repoRoot, worktreePath, force)
}

func (a *App) GetStatus(worktreePath string) ([]git.FileStatus, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return nil, err
	}
	return statusReadCache.getOrLoad(dir, func() ([]git.FileStatus, error) {
		return git.GetStatus(dir)
	})
}

// mutateWorktree clears startup read caches then runs a worktree-scoped write.
func mutateWorktree(worktreePath string, fn func(dir string) error) error {
	clearGitReadCaches()
	return withWorktree(worktreePath, fn)
}

func mutateWorktreeResult[T any](worktreePath string, fn func(dir string) (T, error)) (T, error) {
	clearGitReadCaches()
	return withWorktreeResult(worktreePath, fn)
}

func (a *App) GetFileDiff(worktreePath, file string, staged bool) (git.FileDiff, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.FileDiff, error) {
		return git.GetFileDiff(dir, file, staged)
	})
}

func (a *App) StageFiles(worktreePath string, paths []string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.StageFiles(dir, paths)
	})
}

func (a *App) StageAll(worktreePath string) error {
	return mutateWorktree(worktreePath, git.StageAll)
}

func (a *App) UnstageFiles(worktreePath string, paths []string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.UnstageFiles(dir, paths)
	})
}

func (a *App) UnstageAll(worktreePath string) error {
	return mutateWorktree(worktreePath, git.UnstageAll)
}

func (a *App) StageHunk(worktreePath, file string, hunkIndex int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.StageHunk(dir, file, hunkIndex)
	})
}

func (a *App) UnstageHunk(worktreePath, file string, hunkIndex int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.UnstageHunk(dir, file, hunkIndex)
	})
}

func (a *App) DiscardHunk(worktreePath, file string, hunkIndex int, staged bool) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DiscardHunk(dir, file, hunkIndex, staged)
	})
}

func (a *App) StageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.StageLines(dir, file, hunkIndex, lineIndices)
	})
}

func (a *App) UnstageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.UnstageLines(dir, file, hunkIndex, lineIndices)
	})
}

func (a *App) DiscardLines(worktreePath, file string, hunkIndex int, lineIndices []int, staged bool) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DiscardLines(dir, file, hunkIndex, lineIndices, staged)
	})
}

func (a *App) DiscardFiles(worktreePath string, paths []string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DiscardFiles(dir, paths)
	})
}

func (a *App) DeleteUntracked(worktreePath string, paths []string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DeleteUntracked(dir, paths)
	})
}

func (a *App) DiscardAllChanges(worktreePath string) error {
	return mutateWorktree(worktreePath, git.DiscardAllChanges)
}

func (a *App) AbortMerge(worktreePath string) error {
	return mutateWorktree(worktreePath, git.AbortMerge)
}

func (a *App) IsMerging(worktreePath string) (bool, error) {
	return withWorktreeResult(worktreePath, git.IsMerging)
}

func (a *App) GetRepoOperationState(worktreePath string) (git.RepoOperationState, error) {
	return withWorktreeResult(worktreePath, git.GetRepoOperationState)
}

func (a *App) IsRebasing(worktreePath string) (bool, error) {
	return withWorktreeResult(worktreePath, git.IsRebasing)
}

func (a *App) RebaseBranch(worktreePath, upstream string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.RebaseBranch(dir, upstream)
	})
}

func (a *App) ContinueRebase(worktreePath string) error {
	return mutateWorktree(worktreePath, git.ContinueRebase)
}

func (a *App) AbortRebase(worktreePath string) error {
	return mutateWorktree(worktreePath, git.AbortRebase)
}

func (a *App) CherryPick(worktreePath, sha string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.CherryPick(dir, sha)
	})
}

func (a *App) ContinueCherryPick(worktreePath string) error {
	return mutateWorktree(worktreePath, git.ContinueCherryPick)
}

func (a *App) AbortCherryPick(worktreePath string) error {
	return mutateWorktree(worktreePath, git.AbortCherryPick)
}

func (a *App) Commit(worktreePath, message string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.Commit(dir, message)
	})
}

func (a *App) GetAmendInfo(worktreePath string) (git.AmendInfo, error) {
	return withWorktreeResult(worktreePath, git.GetAmendInfo)
}

func (a *App) AmendCommit(worktreePath, message string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.AmendCommit(dir, message)
	})
}

func (a *App) Fetch(worktreePath string) error {
	a.emitGitProgress("フェッチしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.FetchWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) FetchCurrentUpstream(worktreePath string) error {
	a.emitGitProgress("ブランチを取得中…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.FetchCurrentUpstreamWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) FetchPrune(worktreePath string) ([]string, error) {
	a.emitGitProgress("フェッチしています…")
	return mutateWorktreeResult(worktreePath, func(dir string) ([]string, error) {
		return git.FetchPruneWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) Pull(worktreePath string) error {
	a.emitGitProgress("プルしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PullWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) PullRebase(worktreePath string) error {
	a.emitGitProgress("プルしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PullRebaseWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) PullForce(worktreePath string) error {
	a.emitGitProgress("強制プルしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PullForceWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) Push(worktreePath string) error {
	a.emitGitProgress("プッシュしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PushWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) PushForce(worktreePath string) error {
	a.emitGitProgress("強制プッシュしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PushForceWithProgress(dir, a.emitGitProgress)
	})
}

func (a *App) PushSetUpstream(worktreePath, remote string) error {
	a.emitGitProgress("プッシュしています…")
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PushSetUpstreamWithProgress(dir, remote, a.emitGitProgress)
	})
}

func (a *App) OpenMergetool(worktreePath, file string) error {
	return withWorktree(worktreePath, func(dir string) error {
		settings, err := config.Load()
		if err != nil {
			return err
		}
		return git.OpenMergetool(dir, file, settings.MergeTool.Path, settings.MergeTool.Args)
	})
}

func (a *App) OpenDifftool(worktreePath, file string, staged bool) error {
	return withWorktree(worktreePath, func(dir string) error {
		settings, err := config.Load()
		if err != nil {
			return err
		}
		return git.OpenDifftool(dir, file, staged, settings.DiffTool.Path, settings.DiffTool.Args)
	})
}

func (a *App) OpenCommitDifftool(worktreePath, sha, file string) error {
	return withWorktree(worktreePath, func(dir string) error {
		settings, err := config.Load()
		if err != nil {
			return err
		}
		return git.OpenCommitDifftool(dir, sha, file, settings.DiffTool.Path, settings.DiffTool.Args)
	})
}

func (a *App) OpenRangeDifftool(worktreePath, fromRef, toRef, file string) error {
	return withWorktree(worktreePath, func(dir string) error {
		settings, err := config.Load()
		if err != nil {
			return err
		}
		return git.OpenRangeDifftool(dir, fromRef, toRef, file, settings.DiffTool.Path, settings.DiffTool.Args)
	})
}

func (a *App) ListCommits(worktreePath, scope, branch string, skip, limit int, searchType, searchQuery string) (git.ListCommitsResult, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.ListCommitsResult, error) {
		return git.ListCommits(git.ListCommitsParams{
			WorktreePath: dir,
			Scope:        scope,
			Branch:       branch,
			Skip:         skip,
			Limit:        limit,
			SearchType:   searchType,
			SearchQuery:  searchQuery,
		})
	})
}

func (a *App) ListBranchHeads(worktreePath string) ([]git.BranchHead, error) {
	return withWorktreeResult(worktreePath, git.ListBranchHeads)
}

func (a *App) ListCommitFiles(worktreePath, sha string) ([]git.CommitFileChange, error) {
	return withWorktreeResult(worktreePath, func(dir string) ([]git.CommitFileChange, error) {
		return git.ListCommitFiles(dir, sha)
	})
}

func (a *App) GetCommitFileDiff(worktreePath, sha, file string) (git.FileDiff, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.FileDiff, error) {
		return git.GetCommitFileDiff(dir, sha, file)
	})
}

func (a *App) ListRangeFiles(worktreePath, fromRef, toRef string) ([]git.CommitFileChange, error) {
	return withWorktreeResult(worktreePath, func(dir string) ([]git.CommitFileChange, error) {
		return git.ListRangeFiles(dir, fromRef, toRef)
	})
}

func (a *App) GetRangeFileDiff(worktreePath, fromRef, toRef, file string) (git.FileDiff, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.FileDiff, error) {
		return git.GetRangeFileDiff(dir, fromRef, toRef, file)
	})
}

func (a *App) SwitchBranch(worktreePath, branch string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.SwitchBranch(dir, branch)
	})
}

func (a *App) CheckoutRemoteBranch(worktreePath, remoteRef string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.CheckoutRemoteBranch(dir, remoteRef)
	})
}

func (a *App) CreateBranch(worktreePath, name string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.CreateBranch(dir, name)
	})
}

func (a *App) DeleteBranch(worktreePath, name string, force bool) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DeleteBranch(dir, name, force)
	})
}

func (a *App) DefaultRemoteBaseRef(worktreePath string) (string, error) {
	return withWorktreeResult(worktreePath, git.DefaultRemoteBaseRef)
}

func (a *App) ListRemoteMergeStatus(worktreePath, baseRef, mode string) ([]git.RemoteMergeEntry, error) {
	return withWorktreeResult(worktreePath, func(dir string) ([]git.RemoteMergeEntry, error) {
		return git.ListRemoteMergeStatus(dir, baseRef, mode)
	})
}

func (a *App) DeleteRemoteBranches(worktreePath string, remoteRefs []string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DeleteRemoteBranches(dir, remoteRefs)
	})
}

func (a *App) RenameBranch(worktreePath, oldName, newName string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.RenameBranch(dir, oldName, newName)
	})
}

func (a *App) MergeBranch(worktreePath, source string, allowFastForward bool) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.MergeBranch(dir, source, allowFastForward)
	})
}

func (a *App) SquashMergeBranch(worktreePath, source string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.SquashMergeBranch(dir, source)
	})
}

func (a *App) ResetToCommit(worktreePath, sha, mode string) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.ResetToCommit(dir, sha, git.ResetMode(mode))
	})
}

func (a *App) ListStashes(worktreePath string) ([]git.StashEntry, error) {
	return withWorktreeResult(worktreePath, git.ListStashes)
}

func (a *App) SaveStash(worktreePath, message string, includeUntracked bool) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.SaveStash(dir, message, includeUntracked)
	})
}

func (a *App) ApplyStash(worktreePath string, index int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.ApplyStash(dir, index)
	})
}

func (a *App) PopStash(worktreePath string, index int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.PopStash(dir, index)
	})
}

func (a *App) DropStash(worktreePath string, index int) error {
	return mutateWorktree(worktreePath, func(dir string) error {
		return git.DropStash(dir, index)
	})
}

func (a *App) ListStashFiles(worktreePath string, index int) ([]git.CommitFileChange, error) {
	return withWorktreeResult(worktreePath, func(dir string) ([]git.CommitFileChange, error) {
		return git.ListStashFiles(dir, index)
	})
}

func (a *App) GetStashFileDiff(worktreePath string, index int, file string) (git.FileDiff, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.FileDiff, error) {
		return git.GetStashFileDiff(dir, index, file)
	})
}
