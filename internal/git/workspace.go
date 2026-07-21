package git

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// StageFiles stages the given paths in the worktree.
func StageFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"add", "--"}, paths)
}

// StageAll stages all unstaged non-conflict paths from status (path-scoped add).
func StageAll(worktreePath string) error {
	entries, err := GetStatus(worktreePath)
	if err != nil {
		return err
	}
	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if IsConflict(entry) {
			continue
		}
		if HasUnstagedChange(entry) {
			paths = append(paths, entry.Path)
		}
	}
	return StageFiles(worktreePath, paths)
}

// UnstageFiles unstages the given paths in the worktree.
func UnstageFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"restore", "--staged", "--"}, paths)
}

// UnstageAll unstages all staged paths from status (path-scoped restore).
func UnstageAll(worktreePath string) error {
	entries, err := GetStatus(worktreePath)
	if err != nil {
		return err
	}
	paths := make([]string, 0, len(entries))
	for _, entry := range entries {
		if HasStagedChange(entry) {
			paths = append(paths, entry.Path)
		}
	}
	return UnstageFiles(worktreePath, paths)
}

// StageHunk stages a single hunk from the unstaged diff of the given file.
func StageHunk(worktreePath, file string, hunkIndex int) error {
	return applyHunk(worktreePath, file, hunkIndex, false, false, true)
}

// UnstageHunk unstages a single hunk from the staged diff of the given file.
func UnstageHunk(worktreePath, file string, hunkIndex int) error {
	return applyHunk(worktreePath, file, hunkIndex, true, true, true)
}

// DiscardHunk reverts a single hunk in the working tree and/or index.
func DiscardHunk(worktreePath, file string, hunkIndex int, staged bool) error {
	if staged {
		if err := applyHunk(worktreePath, file, hunkIndex, true, true, true); err != nil {
			return err
		}
		return applyHunk(worktreePath, file, hunkIndex, true, true, false)
	}
	return applyHunk(worktreePath, file, hunkIndex, false, true, false)
}

// StageLines stages selected add/del lines within a hunk of the unstaged diff.
func StageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return applyLines(worktreePath, file, hunkIndex, lineIndices, false, false, true)
}

// UnstageLines unstages selected add/del lines within a hunk of the staged diff.
func UnstageLines(worktreePath, file string, hunkIndex int, lineIndices []int) error {
	return applyLines(worktreePath, file, hunkIndex, lineIndices, true, true, true)
}

// DiscardLines reverts selected add/del lines in the working tree and/or index.
func DiscardLines(worktreePath, file string, hunkIndex int, lineIndices []int, staged bool) error {
	if staged {
		if err := applyLines(worktreePath, file, hunkIndex, lineIndices, true, true, true); err != nil {
			return err
		}
		return applyLines(worktreePath, file, hunkIndex, lineIndices, true, true, false)
	}
	return applyLines(worktreePath, file, hunkIndex, lineIndices, false, true, false)
}

// DiscardFiles discards unstaged working-tree changes for tracked paths.
func DiscardFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"restore", "--worktree", "--"}, paths)
}

// DeleteUntracked removes untracked files and directories at the given paths.
func DeleteUntracked(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"clean", "-fd", "--"}, paths)
}

// ResetWorkingTree discards all tracked changes and removes all untracked files
// (git reset --hard && git clean -fd). Used by the toolbar "リセット" action.
func ResetWorkingTree(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	if _, err := runGit(dir, "reset", "--hard"); err != nil {
		return err
	}
	_, err = runGit(dir, "clean", "-fd")
	return err
}

// AbortMerge aborts an in-progress merge or squash merge.
// Regular merges use git merge --abort; squash merges leave no MERGE_HEAD,
// so git reset --merge is used instead.
func AbortMerge(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	merging, err := IsMerging(dir)
	if err != nil {
		return err
	}
	if merging {
		_, err = runGit(dir, "merge", "--abort")
		return err
	}
	squashing, err := IsSquashPending(dir)
	if err != nil {
		return err
	}
	if squashing {
		_, err = runGit(dir, "reset", "--merge")
		return err
	}
	return errors.New("中止できるマージがありません")
}

// IsSquashPending reports whether a squash merge is in progress (awaiting commit or conflict resolution).
func IsSquashPending(worktreePath string) (bool, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return false, err
	}
	gitDir, err := nativeGitDir(dir)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(filepath.Join(gitDir, "SQUASH_MSG"))
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// IsMerging reports whether a merge is in progress in the worktree.
func IsMerging(worktreePath string) (bool, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return false, err
	}
	ok, err := nativeHasGitFile(dir, "MERGE_HEAD")
	if err != nil || !ok {
		return false, nil
	}
	return true, nil
}

func applyHunk(worktreePath, file string, hunkIndex int, staged, reverse, toCached bool) error {
	return applyPatchHunk(worktreePath, file, hunkIndex, nil, staged, reverse, toCached)
}

func applyLines(worktreePath, file string, hunkIndex int, lineIndices []int, staged, reverse, toCached bool) error {
	if len(lineIndices) == 0 {
		return errors.New("選択行が空です")
	}
	return applyPatchHunk(worktreePath, file, hunkIndex, lineIndices, staged, reverse, toCached)
}

func applyPatchHunk(worktreePath, file string, hunkIndex int, lineIndices []int, staged, reverse, toCached bool) error {
	diff, err := GetFileDiff(worktreePath, file, staged)
	if err != nil {
		return err
	}
	if hunkIndex < 0 || hunkIndex >= len(diff.Hunks) {
		return errors.New("hunk index が範囲外です")
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	hunk := diff.Hunks[hunkIndex]
	if lineIndices != nil {
		hunk, err = PartialHunk(hunk, lineIndices)
		if err != nil {
			return err
		}
	}

	patch := HunkToPatch(file, hunk)
	args := []string{"apply"}
	if toCached {
		args = append(args, "--cached")
	}
	if reverse {
		args = append(args, "--reverse")
	}
	_, err = runGitWithStdin(dir, patch, args...)
	return err
}

// AmendInfo describes whether the tip commit can be amended.
type AmendInfo struct {
	CanAmend    bool   `json:"canAmend"`
	Reason      string `json:"reason"`
	HeadMessage string `json:"headMessage"`
}

// Commit creates a commit with the given message.
func Commit(worktreePath, message string) error {
	message = strings.TrimSpace(message)
	if message == "" {
		return errors.New("コミットメッセージを入力してください")
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, "commit", "-m", message)
	return err
}

// GetAmendInfo returns whether amending HEAD is allowed, and the tip message.
func GetAmendInfo(worktreePath string) (AmendInfo, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return AmendInfo{}, err
	}

	headMessage, err := headCommitMessage(dir)
	if err != nil {
		return AmendInfo{
			CanAmend: false,
			Reason:   "コミットがありません",
		}, nil
	}

	if reason := amendBlockReason(dir); reason != "" {
		return AmendInfo{
			CanAmend:    false,
			Reason:      reason,
			HeadMessage: headMessage,
		}, nil
	}

	return AmendInfo{
		CanAmend:    true,
		HeadMessage: headMessage,
	}, nil
}

// AmendCommit rewrites HEAD with the given message (and any staged changes).
func AmendCommit(worktreePath, message string) error {
	message = strings.TrimSpace(message)
	if message == "" {
		return errors.New("コミットメッセージを入力してください")
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	if reason := amendBlockReason(dir); reason != "" {
		return errors.New(reason)
	}

	_, err = runGit(dir, "commit", "--amend", "-m", message)
	return err
}

func headCommitMessage(dir string) (string, error) {
	return nativeHeadCommitMessage(dir)
}

func amendBlockReason(dir string) string {
	if !nativeHasHEAD(dir) {
		return "コミットがありません"
	}
	merging, err := IsMerging(dir)
	if err != nil {
		return "状態の確認に失敗しました"
	}
	if merging {
		return "マージ中は修正できません"
	}
	rebasing, err := IsRebasing(dir)
	if err != nil {
		return "状態の確認に失敗しました"
	}
	if rebasing {
		return "リベース中は修正できません"
	}
	picking, err := IsCherryPicking(dir)
	if err != nil {
		return "状態の確認に失敗しました"
	}
	if picking {
		return "cherry-pick 中は修正できません"
	}
	ahead, hasUpstream, err := nativeAheadOfUpstream(dir)
	if err != nil {
		return "状態の確認に失敗しました"
	}
	if hasUpstream && ahead == 0 {
		return "すでにプッシュ済みです"
	}
	return ""
}

func runGitPaths(worktreePath string, prefix []string, paths []string) error {
	if len(paths) == 0 {
		return nil
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	args := append(append([]string{}, prefix...), paths...)
	_, err = runGit(dir, args...)
	return err
}
