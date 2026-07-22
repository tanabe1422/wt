package git

import (
	"os"
	"path/filepath"
	"strings"
)

// annotateBrokenWorktrees marks registered worktrees whose directories are missing,
// empty, or missing a valid .git worktree link.
func annotateBrokenWorktrees(entries []WorktreeEntry) {
	for i := range entries {
		if entries[i].IsMain || entries[i].IsBare {
			continue
		}
		entries[i].IsBroken = isBrokenWorktreePath(entries[i].Path)
	}
}

func isBrokenWorktreePath(path string) bool {
	info, err := os.Lstat(path)
	if err != nil {
		return true
	}
	if !info.IsDir() {
		return true
	}
	empty, err := isEffectivelyEmptyDir(path)
	if err != nil || empty {
		return true
	}
	return !hasWorktreeGitLink(path)
}

func hasWorktreeGitLink(path string) bool {
	gitPath := filepath.Join(path, ".git")
	info, err := os.Lstat(gitPath)
	if err != nil {
		return false
	}
	if info.IsDir() {
		// A real .git directory means this is a main repo, not a linked worktree.
		// Treat as "has git metadata" so we don't mark random repos broken.
		return true
	}
	data, err := os.ReadFile(gitPath)
	if err != nil {
		return false
	}
	return strings.HasPrefix(strings.TrimSpace(string(data)), "gitdir:")
}

// findOrphanWorktreeEntries finds leftover worktree directories that are no longer
// registered with git (common after a half-failed remove + prune), and returns
// them as broken list entries so the UI can still delete them.
func findOrphanWorktreeEntries(repoRoot string, known []WorktreeEntry) []WorktreeEntry {
	parent := filepath.Dir(repoRoot)
	entries, err := os.ReadDir(parent)
	if err != nil {
		return nil
	}

	knownPaths := make(map[string]struct{}, len(known))
	for _, entry := range known {
		knownPaths[filepath.Clean(entry.Path)] = struct{}{}
	}

	var orphans []WorktreeEntry
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		abs := filepath.Join(parent, entry.Name())
		abs, err := filepath.Abs(abs)
		if err != nil {
			continue
		}
		if pathsEqual(abs, repoRoot) {
			continue
		}
		if _, ok := knownPaths[filepath.Clean(abs)]; ok {
			continue
		}
		if !looksLikeOrphanWorktreePath(repoRoot, abs) {
			continue
		}
		orphans = append(orphans, WorktreeEntry{
			Path:     abs,
			Branch:   "",
			IsBroken: true,
		})
	}
	return orphans
}

// looksLikeOrphanWorktreePath reports whether path is a leftover linked worktree
// of repoRoot (has a .git file pointing at this repo's worktrees admin dir).
func looksLikeOrphanWorktreePath(repoRoot, path string) bool {
	gitPath := filepath.Join(path, ".git")
	info, err := os.Lstat(gitPath)
	if err != nil || info.IsDir() {
		return false
	}
	data, err := os.ReadFile(gitPath)
	if err != nil {
		return false
	}
	line := strings.TrimSpace(string(data))
	prefix, gitdir, ok := strings.Cut(line, "gitdir:")
	if !ok || strings.TrimSpace(prefix) != "" {
		return false
	}
	gitdir = strings.TrimSpace(gitdir)
	if gitdir == "" {
		return false
	}
	if !filepath.IsAbs(gitdir) {
		gitdir = filepath.Join(path, gitdir)
	}
	gitdir = filepath.Clean(gitdir)
	wantPrefix := filepath.Clean(filepath.Join(repoRoot, ".git", "worktrees"))
	return strings.HasPrefix(strings.ToLower(gitdir), strings.ToLower(wantPrefix+string(filepath.Separator))) ||
		strings.EqualFold(filepath.Dir(gitdir), wantPrefix)
}
