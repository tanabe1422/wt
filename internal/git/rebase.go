package git

import (
	"errors"
	"path/filepath"
	"strings"
)

// RepoOperationKind describes an in-progress git operation in the worktree.
type RepoOperationKind string

const (
	RepoOperationNone   RepoOperationKind = "none"
	RepoOperationMerge  RepoOperationKind = "merge"
	RepoOperationRebase RepoOperationKind = "rebase"
)

// RepoOperationState is the current merge/rebase state of a worktree.
type RepoOperationState struct {
	Kind RepoOperationKind `json:"kind"`
}

// ErrWorkingTreeDirty is returned when rebase cannot start due to uncommitted changes.
var ErrWorkingTreeDirty = errors.New("未コミットの変更があります。コミットするかスタッシュしてからリベースしてください。")

// GetRepoOperationState reports whether a merge or rebase is in progress.
func GetRepoOperationState(worktreePath string) (RepoOperationState, error) {
	rebasing, err := IsRebasing(worktreePath)
	if err != nil {
		return RepoOperationState{}, err
	}
	if rebasing {
		return RepoOperationState{Kind: RepoOperationRebase}, nil
	}
	merging, err := IsMerging(worktreePath)
	if err != nil {
		return RepoOperationState{}, err
	}
	if merging {
		return RepoOperationState{Kind: RepoOperationMerge}, nil
	}
	return RepoOperationState{Kind: RepoOperationNone}, nil
}

// IsRebasing reports whether a rebase is in progress in the worktree.
func IsRebasing(worktreePath string) (bool, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return false, err
	}
	_, err = runGit(dir, "rev-parse", "-q", "--verify", "REBASE_HEAD")
	if err != nil {
		return false, nil
	}
	return true, nil
}

func hasWorkingTreeChanges(dir string) (bool, error) {
	status, err := GetStatus(dir)
	if err != nil {
		return false, err
	}
	return len(status) > 0, nil
}

func rebasePrecheck(dir string) error {
	merging, err := IsMerging(dir)
	if err != nil {
		return err
	}
	if merging {
		return errors.New("マージ中はリベースできません")
	}
	rebasing, err := IsRebasing(dir)
	if err != nil {
		return err
	}
	if rebasing {
		return errors.New("リベース中は新しいリベースを開始できません")
	}
	if _, err := runGit(dir, "symbolic-ref", "-q", "HEAD"); err != nil {
		return errors.New("ブランチにチェックアウトしてからリベースしてください")
	}
	dirty, err := hasWorkingTreeChanges(dir)
	if err != nil {
		return err
	}
	if dirty {
		return ErrWorkingTreeDirty
	}
	return nil
}

// RebaseBranch rebases the current branch onto upstream.
func RebaseBranch(worktreePath, upstream string) error {
	upstream = strings.TrimSpace(upstream)
	if upstream == "" {
		return errors.New("ブランチ名が空です")
	}
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	if err := rebasePrecheck(dir); err != nil {
		return err
	}
	_, err = runGit(dir, "rebase", upstream)
	return err
}

// ContinueRebase continues an in-progress rebase after conflicts are resolved.
func ContinueRebase(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "rebase", "--continue")
	return err
}

// AbortRebase aborts an in-progress rebase.
func AbortRebase(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "rebase", "--abort")
	return err
}

// PullRebase pulls from upstream with rebase.
func PullRebase(worktreePath string) error {
	return PullRebaseWithProgress(worktreePath, nil)
}

// PullRebaseWithProgress pulls with rebase and reports stderr progress lines.
func PullRebaseWithProgress(worktreePath string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGitProgress(dir, onProgress, pullRebaseArgs()...)
	return err
}

func pullRebaseArgs() []string {
	return []string{"pull", "--rebase", "--progress"}
}
