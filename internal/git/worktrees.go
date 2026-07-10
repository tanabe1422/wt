package git

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// WorktreeEntry describes a git worktree attached to a repository.
type WorktreeEntry struct {
	Path             string `json:"path"`
	Branch           string `json:"branch"`
	IsMain           bool   `json:"isMain"`
	IsBare           bool   `json:"isBare"`
	IsLocked         bool   `json:"isLocked"`
	ChangedFileCount int    `json:"changedFileCount"`
}

// ListWorktrees returns all worktrees for the repository at repoPath.
func ListWorktrees(repoPath string) ([]WorktreeEntry, error) {
	repoRoot, err := filepath.Abs(filepath.Clean(repoPath))
	if err != nil {
		return nil, err
	}

	out, err := runGit(repoRoot, "worktree", "list", "--porcelain")
	if err != nil {
		return nil, err
	}

	entries, err := parseWorktreePorcelain(out, repoRoot)
	if err != nil {
		return nil, err
	}

	for i := range entries {
		status, statusErr := GetStatus(entries[i].Path)
		if statusErr != nil {
			entries[i].ChangedFileCount = 0
			continue
		}
		entries[i].ChangedFileCount = len(status)
	}

	return entries, nil
}

// DefaultWorktreePath suggests a sibling directory path for a new worktree.
// When the preferred path already exists, a numeric suffix (-2, -3, ...) is appended
// to the leaf directory name.
func DefaultWorktreePath(repoRoot, branchName string) (string, error) {
	branchName = strings.TrimSpace(branchName)
	if branchName == "" {
		return "", errors.New("ブランチ名が空です")
	}

	absRoot, err := filepath.Abs(filepath.Clean(repoRoot))
	if err != nil {
		return "", err
	}

	parent := filepath.Dir(absRoot)
	preferred := filepath.Join(parent, filepath.FromSlash(branchName))
	return findAvailableWorktreePath(preferred)
}

// AddWorktree creates a new worktree at targetPath for the given branch.
// For remote refs, a local tracking branch is created when needed.
// Returns the absolute path of the created worktree.
func AddWorktree(repoRoot, targetPath, branch string, isRemote bool) (string, error) {
	branch = strings.TrimSpace(branch)
	if branch == "" {
		return "", errors.New("ブランチ名が空です")
	}
	targetPath = strings.TrimSpace(targetPath)
	if targetPath == "" {
		return "", errors.New("パスが空です")
	}

	absRoot, err := filepath.Abs(filepath.Clean(repoRoot))
	if err != nil {
		return "", err
	}

	absPath, err := resolveWorktreeTargetPath(absRoot, targetPath)
	if err != nil {
		return "", err
	}

	if _, err := os.Stat(absPath); err == nil {
		return "", fmt.Errorf("ディレクトリが既に存在します: %s", absPath)
	} else if !os.IsNotExist(err) {
		return "", err
	}

	localBranch := branch
	if isRemote {
		localBranch, err = localBranchFromRemote(branch)
		if err != nil {
			return "", err
		}
	}

	if err := ensureBranchNotCheckedOut(absRoot, localBranch); err != nil {
		return "", err
	}

	if isRemote {
		_, verifyErr := runGit(absRoot, "rev-parse", "--verify", "refs/heads/"+localBranch)
		if verifyErr == nil {
			_, err = runGit(absRoot, "worktree", "add", absPath, localBranch)
		} else {
			_, err = runGit(absRoot, "worktree", "add", "-b", localBranch, absPath, branch)
		}
	} else {
		_, err = runGit(absRoot, "worktree", "add", absPath, branch)
	}
	if err != nil {
		return "", err
	}

	return absPath, nil
}

func resolveWorktreeTargetPath(repoRoot, targetPath string) (string, error) {
	if filepath.IsAbs(targetPath) {
		return filepath.Abs(filepath.Clean(targetPath))
	}
	return filepath.Abs(filepath.Join(repoRoot, targetPath))
}

func findAvailableWorktreePath(preferred string) (string, error) {
	if _, err := os.Stat(preferred); os.IsNotExist(err) {
		return preferred, nil
	} else if err != nil {
		return "", err
	}

	dir := filepath.Dir(preferred)
	base := filepath.Base(preferred)
	for n := 2; n < 1000; n++ {
		candidate := filepath.Join(dir, fmt.Sprintf("%s-%d", base, n))
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate, nil
		} else if err != nil {
			return "", err
		}
	}
	return "", fmt.Errorf("空きパスが見つかりません: %s", preferred)
}

func ensureBranchNotCheckedOut(repoRoot, branch string) error {
	entries, err := ListWorktrees(repoRoot)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.Branch == branch {
			return fmt.Errorf("ブランチ「%s」は既にワークツリーでチェックアウトされています", branch)
		}
	}
	return nil
}

func pathsEqual(a, b string) bool {
	a = filepath.Clean(a)
	b = filepath.Clean(b)
	return strings.EqualFold(a, b)
}
