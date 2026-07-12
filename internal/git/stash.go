package git

import (
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
	_, err = runGit(dir, "stash", "apply", ref)
	return err
}

// PopStash applies stash@{index} and removes it.
func PopStash(worktreePath string, index int) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	ref, err := stashRef(index)
	if err != nil {
		return err
	}
	_, err = runGit(dir, "stash", "pop", ref)
	return err
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
