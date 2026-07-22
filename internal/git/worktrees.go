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
	// IsBroken is true when the worktree is registered (or recovered as an orphan)
	// but its directory is missing, empty, or missing a valid .git worktree link.
	// Typical cause: git worktree remove failed halfway (e.g. folder locked on Windows).
	IsBroken         bool `json:"isBroken"`
	ChangedFileCount int  `json:"changedFileCount"`
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
	OK    bool   `json:"ok"`
}

// GetWorktreeChangedCounts returns badge counts for many worktrees in parallel.
// Failed status probes set OK=false so callers can skip overwriting prior badges.
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
			results[i].OK = true
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

	entries, err := parseWorktreePorcelain(out, repoRoot)
	if err != nil {
		return nil, err
	}
	annotateBrokenWorktrees(entries)
	entries = append(entries, findOrphanWorktreeEntries(repoRoot, entries)...)
	return entries, nil
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
			if entries[i].IsBroken {
				entries[i].ChangedFileCount = 0
				return
			}
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
//
// On Windows (and similar), git may delete the contents then fail to remove the
// directory itself when another process holds it open. In that case this tries
// to finish cleanup: remove an empty remnant folder and prune stale admin files.
//
// Broken / orphan paths (empty remnant, missing .git link, or leftover directory
// no longer registered with git) can also be cleaned up here so they remain
// deletable from the worktree list.
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
		if looksLikeOrphanWorktreePath(absRoot, absPath) {
			return cleanupWorktreeRemnant(absRoot, absPath, force, errors.New("登録のないワークツリー残骸"))
		}
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
	if err == nil {
		return nil
	}
	// Includes broken / orphan leftovers: empty remnant cleanup, optional force
	// delete of remaining files, then prune stale git admin entries.
	return recoverPartialWorktreeRemoval(absRoot, absPath, force, err)
}

// recoverPartialWorktreeRemoval finishes cleanup when git worktree remove left a
// remnant (typically an empty directory) or already dropped the admin entry.
func recoverPartialWorktreeRemoval(repoRoot, worktreePath string, force bool, removeErr error) error {
	return cleanupWorktreeRemnant(repoRoot, worktreePath, force, removeErr)
}

// cleanupWorktreeRemnant removes leftover directories and prunes stale registrations.
// Empty remnants are always removed. Non-empty remnants require force=true.
func cleanupWorktreeRemnant(repoRoot, worktreePath string, force bool, removeErr error) error {
	state, err := inspectWorktreeRemnant(worktreePath)
	if err != nil {
		return fmt.Errorf("%w\n残骸の確認にも失敗しました: %v", removeErr, err)
	}

	switch state {
	case remnantMissing:
		if pruneErr := pruneWorktrees(repoRoot); pruneErr != nil {
			return fmt.Errorf("%w\n空の登録の整理にも失敗しました: %v", removeErr, pruneErr)
		}
		if worktreeRegistered(repoRoot, worktreePath) {
			return wrapWorktreeRemoveError(removeErr, worktreePath, false)
		}
		return nil
	case remnantEmpty:
		if rmErr := os.RemoveAll(worktreePath); rmErr != nil {
			return wrapWorktreeRemoveError(removeErr, worktreePath, true)
		}
		if pruneErr := pruneWorktrees(repoRoot); pruneErr != nil {
			return fmt.Errorf("%w\n空フォルダは削除しましたが、登録の整理に失敗しました: %v", removeErr, pruneErr)
		}
		if worktreeRegistered(repoRoot, worktreePath) {
			return wrapWorktreeRemoveError(removeErr, worktreePath, false)
		}
		return nil
	default:
		if !force {
			return fmt.Errorf(
				"%w\nフォルダにファイルが残っています。強制削除を有効にするか、中身を確認してから再試行してください",
				removeErr,
			)
		}
		if rmErr := os.RemoveAll(worktreePath); rmErr != nil {
			return wrapWorktreeRemoveError(removeErr, worktreePath, false)
		}
		if pruneErr := pruneWorktrees(repoRoot); pruneErr != nil {
			return fmt.Errorf("%w\nフォルダは削除しましたが、登録の整理に失敗しました: %v", removeErr, pruneErr)
		}
		if worktreeRegistered(repoRoot, worktreePath) {
			return wrapWorktreeRemoveError(removeErr, worktreePath, false)
		}
		return nil
	}
}

type remnantState int

const (
	remnantMissing remnantState = iota
	remnantEmpty
	remnantHasContent
)

func inspectWorktreeRemnant(path string) (remnantState, error) {
	info, err := os.Lstat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return remnantMissing, nil
		}
		return remnantMissing, err
	}
	if !info.IsDir() {
		return remnantHasContent, nil
	}
	empty, err := isEffectivelyEmptyDir(path)
	if err != nil {
		return remnantMissing, err
	}
	if empty {
		return remnantEmpty, nil
	}
	return remnantHasContent, nil
}

func isEffectivelyEmptyDir(path string) (bool, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return false, err
	}
	for _, entry := range entries {
		child := filepath.Join(path, entry.Name())
		if entry.IsDir() {
			empty, err := isEffectivelyEmptyDir(child)
			if err != nil || !empty {
				return false, err
			}
			continue
		}
		// A lone gitdir link is remnant metadata, not user content. Orphan /
		// half-removed worktrees often keep only this file; treat as empty so
		// cleanup does not require the force checkbox.
		if entry.Name() == ".git" && isGitdirLinkFile(child) {
			continue
		}
		return false, nil
	}
	return true, nil
}

func isGitdirLinkFile(path string) bool {
	info, err := os.Lstat(path)
	if err != nil || info.IsDir() {
		return false
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return strings.HasPrefix(strings.TrimSpace(string(data)), "gitdir:")
}

func pruneWorktrees(repoRoot string) error {
	_, err := runGit(repoRoot, "worktree", "prune")
	return err
}

func worktreeRegistered(repoRoot, worktreePath string) bool {
	out, err := runGit(repoRoot, "worktree", "list", "--porcelain")
	if err != nil {
		return true
	}
	entries, err := parseWorktreePorcelain(out, repoRoot)
	if err != nil {
		return true
	}
	for _, entry := range entries {
		if pathsEqual(entry.Path, worktreePath) {
			return true
		}
	}
	return false
}

func wrapWorktreeRemoveError(removeErr error, worktreePath string, emptyRemnantLocked bool) error {
	if emptyRemnantLocked {
		return fmt.Errorf(
			"%w\n中身は削除済みですが、空フォルダ「%s」を削除できません。ターミナルやエディタでこのフォルダを開いている場合は閉じてから再試行してください",
			removeErr,
			worktreePath,
		)
	}
	if looksLikePathInUseError(removeErr) {
		return fmt.Errorf(
			"%w\nフォルダが他のアプリで使用中の可能性があります。ターミナルやエディタを閉じてから再試行してください",
			removeErr,
		)
	}
	return removeErr
}

func looksLikePathInUseError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	needles := []string{
		"being used by another process",
		"access is denied",
		"permission denied",
		"device or resource busy",
		"resource busy",
		"ebusy",
	}
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
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
