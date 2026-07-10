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

// UnstageFiles unstages the given paths in the worktree.
func UnstageFiles(worktreePath string, paths []string) error {
	return runGitPaths(worktreePath, []string{"restore", "--staged", "--"}, paths)
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

// Fetch fetches from the upstream remote.
func Fetch(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, fetchArgs()...)
	return err
}

// Pull pulls from the upstream remote.
func Pull(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, pullArgs()...)
	return err
}

// OpenMergetool launches git mergetool for the given conflicted file.
func OpenMergetool(worktreePath, file string) error {
	file = strings.TrimSpace(file)
	if file == "" {
		return errors.New("ファイルパスが空です")
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, openMergetoolArgs(file)...)
	return err
}

// Push pushes the current branch to its upstream remote.
func Push(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, pushArgs()...)
	return err
}

func fetchArgs() []string {
	return []string{"fetch"}
}

func pullArgs() []string {
	return []string{"pull"}
}

func pushArgs() []string {
	return []string{"push"}
}

func openMergetoolArgs(file string) []string {
	return []string{"mergetool", "--no-prompt", "--", file}
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
