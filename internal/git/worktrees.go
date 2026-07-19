package git

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// WorktreeEntry describes a git worktree attached to a repository.
type WorktreeEntry struct {
	Path             string `json:"path"`
	Branch           string `json:"branch"`
	Head             string `json:"head"`
	IsMain           bool   `json:"isMain"`
	IsBare           bool   `json:"isBare"`
	IsLocked         bool   `json:"isLocked"`
	ChangedFileCount int    `json:"changedFileCount"`
}

// ListWorktrees returns all worktrees for the repository at repoPath,
// including a changed-file badge count for each worktree.
func ListWorktrees(repoPath string) ([]WorktreeEntry, error) {
	entries, err := ListWorktreesMeta(repoPath)
	if err != nil {
		return nil, err
	}
	fillChangedFileCounts(entries)
	return entries, nil
}

// ListWorktreesMeta lists worktrees without running git status per entry.
// Use this when only path/branch metadata is needed; badge counts stay 0.
func ListWorktreesMeta(repoPath string) ([]WorktreeEntry, error) {
	return listWorktreesMeta(repoPath)
}

// GetWorktreeChangedCount returns the changed-file badge count for one worktree.
func GetWorktreeChangedCount(worktreePath string) (int, error) {
	return countChangedFiles(worktreePath)
}

// WorktreeChangedCount is a badge count for one worktree path.
type WorktreeChangedCount struct {
	Path  string `json:"path"`
	Count int    `json:"count"`
}

// GetWorktreeChangedCounts returns badge counts for many worktrees in parallel.
func GetWorktreeChangedCounts(paths []string) []WorktreeChangedCount {
	results := make([]WorktreeChangedCount, len(paths))
	if len(paths) == 0 {
		return results
	}

	var wg sync.WaitGroup
	wg.Add(len(paths))
	for i, p := range paths {
		go func(i int, p string) {
			defer wg.Done()
			results[i].Path = p
			n, err := countChangedFiles(p)
			if err != nil {
				return
			}
			results[i].Count = n
		}(i, p)
	}
	wg.Wait()
	return results
}

// listWorktreesMeta lists worktrees without running git status per entry.
func listWorktreesMeta(repoPath string) ([]WorktreeEntry, error) {
	repoRoot, err := filepath.Abs(filepath.Clean(repoPath))
	if err != nil {
		return nil, err
	}

	out, err := runGit(repoRoot, "worktree", "list", "--porcelain")
	if err != nil {
		return nil, err
	}

	return parseWorktreePorcelain(out, repoRoot)
}

// fillChangedFileCounts sets ChangedFileCount for each entry in parallel.
func fillChangedFileCounts(entries []WorktreeEntry) {
	if len(entries) == 0 {
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(entries))
	for i := range entries {
		go func(i int) {
			defer wg.Done()
			n, err := countChangedFiles(entries[i].Path)
			if err != nil {
				entries[i].ChangedFileCount = 0
				return
			}
			entries[i].ChangedFileCount = n
		}(i)
	}
	wg.Wait()
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

// RemoveWorktree removes a linked worktree. The main worktree cannot be removed.
// When force is true, dirty worktrees are removed with git worktree remove --force.
func RemoveWorktree(repoRoot, worktreePath string, force bool) error {
	absRoot, err := filepath.Abs(filepath.Clean(repoRoot))
	if err != nil {
		return err
	}
	absPath, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	entries, err := listWorktreesMeta(absRoot)
	if err != nil {
		return err
	}

	var target *WorktreeEntry
	for i := range entries {
		if pathsEqual(entries[i].Path, absPath) {
			target = &entries[i]
			break
		}
	}
	if target == nil {
		return fmt.Errorf("ワークツリーが見つかりません: %s", absPath)
	}
	if target.IsMain {
		return errors.New("メインのワークツリーは削除できません")
	}

	args := []string{"worktree", "remove"}
	if force {
		args = append(args, "--force")
	}
	args = append(args, absPath)
	_, err = runGit(absRoot, args...)
	return err
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
	entries, err := listWorktreesMeta(repoRoot)
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
