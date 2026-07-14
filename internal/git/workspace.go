package git

import (
	"errors"
	"path/filepath"
	"strings"
)

// StageFiles stages the given paths in the worktree.
func StageFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"add", "--"}, paths)
}

// StageAll stages all changes in the worktree (git add -A), excluding unmerged
// conflict paths so they are not accidentally marked resolved.
func StageAll(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	excludes, err := listUnmergedPaths(dir)
	if err != nil {
		return err
	}
	if len(excludes) == 0 {
		_, err = runGit(dir, "add", "-A")
		return err
	}

	args := []string{"add", "-A", "--", "."}
	for _, path := range excludes {
		args = append(args, ":(exclude)"+path)
	}
	_, err = runGit(dir, args...)
	return err
}

// UnstageFiles unstages the given paths in the worktree.
func UnstageFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"restore", "--staged", "--"}, paths)
}

// UnstageAll unstages all staged changes in the worktree.
func UnstageAll(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "restore", "--staged", ".")
	return err
}

// listUnmergedPaths returns unique paths with unmerged index stages.
func listUnmergedPaths(dir string) ([]string, error) {
	out, err := runGit(dir, "ls-files", "-u")
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(out) == "" {
		return nil, nil
	}

	seen := make(map[string]struct{})
	var paths []string
	for _, line := range strings.Split(out, "\n") {
		if line == "" {
			continue
		}
		tab := strings.IndexByte(line, '\t')
		if tab < 0 || tab+1 >= len(line) {
			continue
		}
		path := line[tab+1:]
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		paths = append(paths, path)
	}
	return paths, nil
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

// DiscardFiles discards unstaged working-tree changes for tracked paths.
func DiscardFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"restore", "--worktree", "--"}, paths)
}

// DeleteUntracked removes untracked files and directories at the given paths.
func DeleteUntracked(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"clean", "-fd", "--"}, paths)
}

// DiscardAllChanges discards all tracked changes and removes all untracked files
// (git reset --hard && git clean -fd).
func DiscardAllChanges(worktreePath string) error {
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

// AbortMerge aborts an in-progress merge (git merge --abort).
func AbortMerge(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "merge", "--abort")
	return err
}

// IsMerging reports whether a merge is in progress in the worktree.
func IsMerging(worktreePath string) (bool, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return false, err
	}
	_, err = runGit(dir, "rev-parse", "-q", "--verify", "MERGE_HEAD")
	if err != nil {
		return false, nil
	}
	return true, nil
}

func applyHunk(worktreePath, file string, hunkIndex int, staged, reverse, toCached bool) error {
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

	patch := HunkToPatch(file, diff.Hunks[hunkIndex])
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
	if _, err := runGit(dir, "rev-parse", "-q", "--verify", "HEAD"); err != nil {
		return "", err
	}
	msg, err := runGit(dir, "log", "-1", "--format=%B")
	if err != nil {
		return "", err
	}
	return strings.TrimRight(msg, "\r\n"), nil
}

func amendBlockReason(dir string) string {
	if _, err := runGit(dir, "rev-parse", "-q", "--verify", "HEAD"); err != nil {
		return "コミットがありません"
	}
	merging, err := IsMerging(dir)
	if err != nil {
		return "状態の確認に失敗しました"
	}
	if merging {
		return "マージ中は修正できません"
	}
	if _, err := runGit(dir, "rev-parse", "-q", "--verify", "@{upstream}"); err != nil {
		return ""
	}
	aheadOut, err := runGit(dir, "rev-list", "--count", "@{upstream}..HEAD")
	if err != nil {
		return "状態の確認に失敗しました"
	}
	ahead := strings.TrimSpace(aheadOut)
	if ahead == "0" {
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
