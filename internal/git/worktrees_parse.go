package git

import (
	"path/filepath"
	"strings"
)

// parseWorktreePorcelain parses `git worktree list --porcelain` output.
func parseWorktreePorcelain(output string, repoRoot string) ([]WorktreeEntry, error) {
	repoRoot, err := filepath.Abs(filepath.Clean(repoRoot))
	if err != nil {
		return nil, err
	}

	entries := make([]WorktreeEntry, 0)
	for _, block := range strings.Split(output, "\n\n") {
		block = strings.TrimSpace(block)
		if block == "" {
			continue
		}

		entry := WorktreeEntry{}
		for _, line := range strings.Split(block, "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			key, value, ok := strings.Cut(line, " ")
			if !ok {
				continue
			}

			switch key {
			case "worktree":
				entry.Path = value
			case "bare":
				entry.IsBare = true
			case "branch":
				entry.Branch = strings.TrimPrefix(value, "refs/heads/")
			case "locked":
				entry.IsLocked = true
			}
		}

		if entry.Path == "" {
			continue
		}

		absPath, err := filepath.Abs(filepath.Clean(entry.Path))
		if err == nil {
			entry.Path = absPath
			entry.IsMain = pathsEqual(absPath, repoRoot)
		}

		entries = append(entries, entry)
	}

	return entries, nil
}
