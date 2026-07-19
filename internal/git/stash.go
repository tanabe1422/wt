package git

import (
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
)

// StashEntry is one entry from `git stash list`.
type StashEntry struct {
	Index   int    `json:"index"`
	Ref     string `json:"ref"`
	Message string `json:"message"`
}

// ListStashes returns stash entries for the repository of worktreePath.
func ListStashes(worktreePath string) ([]StashEntry, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return nil, err
	}

	out, err := runGit(dir, "stash", "list", "--format=%gd%x1f%s")
	if err != nil {
		return nil, err
	}
	return parseStashList(out), nil
}

// SaveStash creates a stash with optional message. When includeUntracked is true,
// untracked files are included (git stash push -u).
func SaveStash(worktreePath, message string, includeUntracked bool) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	args := []string{"stash", "push"}
	if includeUntracked {
		args = append(args, "-u")
	}
	if msg := strings.TrimSpace(message); msg != "" {
		args = append(args, "-m", msg)
	}
	_, err = runGit(dir, args...)
	return err
}

// ApplyStash applies stash@{index} without removing it.
func ApplyStash(worktreePath string, index int) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	ref, err := stashRef(index)
	if err != nil {
		return err
	}
	stdout, stderr, err := runGitCapture(dir, "stash", "apply", ref)
	return mapStashApplyError(err, stdout, stderr)
}

// PopStash applies stash@{index} and removes it.
// On conflict, git keeps the stash entry (same as CLI).
func PopStash(worktreePath string, index int) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	ref, err := stashRef(index)
	if err != nil {
		return err
	}
	stdout, stderr, err := runGitCapture(dir, "stash", "pop", ref)
	return mapStashApplyError(err, stdout, stderr)
}

func mapStashApplyError(err error, stdout, stderr string) error {
	if err == nil {
		return nil
	}
	combined := stdout + "\n" + stderr + "\n" + err.Error()
	if isStashConflictOutput(combined) {
		return errors.New("スタッシュの適用で競合が発生しました。変更パネルで競合を解決してください。スタッシュは一覧に残っています。")
	}
	if msg := strings.TrimSpace(stderr); msg != "" {
		return errors.New(msg)
	}
	if msg := strings.TrimSpace(stdout); msg != "" {
		return errors.New(msg)
	}
	return err
}

func isStashConflictOutput(output string) bool {
	lower := strings.ToLower(output)
	return strings.Contains(lower, "conflict") ||
		strings.Contains(lower, "unmerged paths") ||
		strings.Contains(lower, "could not apply") ||
		strings.Contains(lower, "needs merge")
}

// DropStash removes stash@{index} without applying it.
func DropStash(worktreePath string, index int) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	ref, err := stashRef(index)
	if err != nil {
		return err
	}
	_, err = runGit(dir, "stash", "drop", ref)
	return err
}

// ListStashFiles returns files changed in stash@{index}, including untracked
// files that were saved with stash push -u.
func ListStashFiles(worktreePath string, index int) ([]CommitFileChange, error) {
	if worktreePath == "" {
		return nil, errors.New("ワークツリーが指定されていません")
	}
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return nil, err
	}
	ref, err := stashRef(index)
	if err != nil {
		return nil, err
	}

	out, err := runGitAllowDiffExit(
		dir,
		"stash", "show",
		"--include-untracked",
		"--name-status", "-z",
		ref,
	)
	if err != nil {
		return nil, err
	}
	return parseNameStatusZ(out), nil
}

// GetStashFileDiff returns a parsed unified diff for one file in stash@{index}.
func GetStashFileDiff(worktreePath string, index int, file string) (FileDiff, error) {
	if worktreePath == "" {
		return FileDiff{}, errors.New("ワークツリーが指定されていません")
	}
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return FileDiff{}, err
	}
	ref, err := stashRef(index)
	if err != nil {
		return FileDiff{}, err
	}
	if strings.TrimSpace(file) == "" {
		return FileDiff{}, errors.New("ファイルパスが空です")
	}

	out, err := runGitAllowDiffExit(
		dir,
		"stash", "show",
		"--include-untracked",
		"-U"+strconv.Itoa(diffContextLines),
		ref,
		"--",
		file,
	)
	if err != nil {
		return FileDiff{}, err
	}

	if strings.Contains(out, "Binary files") {
		return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
	}

	return parseUnifiedDiff(file, out), nil
}

func stashRef(index int) (string, error) {
	if index < 0 {
		return "", fmt.Errorf("無効な stash インデックスです")
	}
	return fmt.Sprintf("stash@{%d}", index), nil
}

func parseStashList(raw string) []StashEntry {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []StashEntry{}
	}
	lines := strings.Split(raw, "\n")
	entries := make([]StashEntry, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\x1f", 2)
		ref := strings.TrimSpace(parts[0])
		message := ""
		if len(parts) > 1 {
			message = parts[1]
		}
		index := parseStashIndex(ref)
		if index < 0 {
			continue
		}
		entries = append(entries, StashEntry{
			Index:   index,
			Ref:     ref,
			Message: message,
		})
	}
	return entries
}

func parseStashIndex(ref string) int {
	// Expected: stash@{N} or sometimes with quotes depending on shell; git --format=%gd gives stash@{N}
	ref = strings.TrimSpace(ref)
	if !strings.HasPrefix(ref, "stash@{") || !strings.HasSuffix(ref, "}") {
		return -1
	}
	n, err := strconv.Atoi(ref[len("stash@{") : len(ref)-1])
	if err != nil {
		return -1
	}
	return n
}
