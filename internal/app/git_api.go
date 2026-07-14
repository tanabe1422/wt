package app

import (
	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

func (a *App) ListBranches(repoPath string) ([]git.BranchEntry, error) {
	return listFromRepo(repoPath, git.ListBranches)
}

func (a *App) ListWorktrees(repoPath string) ([]git.WorktreeEntry, error) {
	return listFromRepo(repoPath, git.ListWorktrees)
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
	return git.AddWorktree(repoRoot, targetPath, branch, isRemote)
}

func (a *App) RemoveWorktree(repoPath, worktreePath string, force bool) error {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return err
	}
	return git.RemoveWorktree(repoRoot, worktreePath, force)
}

func (a *App) GetStatus(worktreePath string) ([]git.FileStatus, error) {
	return withWorktreeResult(worktreePath, git.GetStatus)
}

func (a *App) GetFileDiff(worktreePath, file string, staged bool) (git.FileDiff, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.FileDiff, error) {
		return git.GetFileDiff(dir, file, staged)
	})
}

func (a *App) StageFiles(worktreePath string, paths []string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.StageFiles(dir, paths)
	})
}

func (a *App) StageAll(worktreePath string) error {
	return withWorktree(worktreePath, git.StageAll)
}

func (a *App) UnstageFiles(worktreePath string, paths []string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.UnstageFiles(dir, paths)
	})
}

func (a *App) UnstageAll(worktreePath string) error {
	return withWorktree(worktreePath, git.UnstageAll)
}

func (a *App) StageHunk(worktreePath, file string, hunkIndex int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.StageHunk(dir, file, hunkIndex)
	})
}

func (a *App) UnstageHunk(worktreePath, file string, hunkIndex int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.UnstageHunk(dir, file, hunkIndex)
	})
}

func (a *App) DiscardHunk(worktreePath, file string, hunkIndex int, staged bool) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.DiscardHunk(dir, file, hunkIndex, staged)
	})
}

func (a *App) StageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.StageLines(dir, file, hunkIndex, lineIndices)
	})
}

func (a *App) UnstageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.UnstageLines(dir, file, hunkIndex, lineIndices)
	})
}

func (a *App) DiscardLines(worktreePath, file string, hunkIndex int, lineIndices []int, staged bool) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.DiscardLines(dir, file, hunkIndex, lineIndices, staged)
	})
}

func (a *App) DiscardFiles(worktreePath string, paths []string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.DiscardFiles(dir, paths)
	})
}

func (a *App) DeleteUntracked(worktreePath string, paths []string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.DeleteUntracked(dir, paths)
	})
}

func (a *App) DiscardAllChanges(worktreePath string) error {
	return withWorktree(worktreePath, git.DiscardAllChanges)
}

func (a *App) AbortMerge(worktreePath string) error {
	return withWorktree(worktreePath, git.AbortMerge)
}

func (a *App) IsMerging(worktreePath string) (bool, error) {
	return withWorktreeResult(worktreePath, git.IsMerging)
}

func (a *App) Commit(worktreePath, message string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.Commit(dir, message)
	})
}

func (a *App) GetAmendInfo(worktreePath string) (git.AmendInfo, error) {
	return withWorktreeResult(worktreePath, git.GetAmendInfo)
}

func (a *App) AmendCommit(worktreePath, message string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.AmendCommit(dir, message)
	})
}

func (a *App) Fetch(worktreePath string) error {
	return withWorktree(worktreePath, git.Fetch)
}

func (a *App) FetchPrune(worktreePath string) ([]string, error) {
	return withWorktreeResult(worktreePath, git.FetchPrune)
}

func (a *App) Pull(worktreePath string) error {
	return withWorktree(worktreePath, git.Pull)
}

func (a *App) Push(worktreePath string) error {
	return withWorktree(worktreePath, git.Push)
}

func (a *App) PushSetUpstream(worktreePath, remote string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.PushSetUpstream(dir, remote)
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

func (a *App) ListCommits(worktreePath, scope, branch string, skip, limit int) (git.ListCommitsResult, error) {
	return withWorktreeResult(worktreePath, func(dir string) (git.ListCommitsResult, error) {
		return git.ListCommits(git.ListCommitsParams{
			WorktreePath: dir,
			Scope:        scope,
			Branch:       branch,
			Skip:         skip,
			Limit:        limit,
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
	return withWorktree(worktreePath, func(dir string) error {
		return git.SwitchBranch(dir, branch)
	})
}

func (a *App) CheckoutRemoteBranch(worktreePath, remoteRef string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.CheckoutRemoteBranch(dir, remoteRef)
	})
}

func (a *App) CreateBranch(worktreePath, name string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.CreateBranch(dir, name)
	})
}

func (a *App) DeleteBranch(worktreePath, name string, force bool) error {
	return withWorktree(worktreePath, func(dir string) error {
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
	return withWorktree(worktreePath, func(dir string) error {
		return git.DeleteRemoteBranches(dir, remoteRefs)
	})
}

func (a *App) RenameBranch(worktreePath, oldName, newName string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.RenameBranch(dir, oldName, newName)
	})
}

func (a *App) MergeBranch(worktreePath, source string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.MergeBranch(dir, source)
	})
}

func (a *App) SquashMergeBranch(worktreePath, source string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.SquashMergeBranch(dir, source)
	})
}

func (a *App) ResetToCommit(worktreePath, sha, mode string) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.ResetToCommit(dir, sha, git.ResetMode(mode))
	})
}

func (a *App) ListStashes(worktreePath string) ([]git.StashEntry, error) {
	return withWorktreeResult(worktreePath, git.ListStashes)
}

func (a *App) SaveStash(worktreePath, message string, includeUntracked bool) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.SaveStash(dir, message, includeUntracked)
	})
}

func (a *App) ApplyStash(worktreePath string, index int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.ApplyStash(dir, index)
	})
}

func (a *App) PopStash(worktreePath string, index int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.PopStash(dir, index)
	})
}

func (a *App) DropStash(worktreePath string, index int) error {
	return withWorktree(worktreePath, func(dir string) error {
		return git.DropStash(dir, index)
	})
}
