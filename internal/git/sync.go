package git

import (
	"path/filepath"
	"strings"
)

// Fetch fetches from the upstream remote.
func Fetch(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, fetchArgs(false)...)
	return err
}

// FetchPrune fetches from the upstream remote and prunes stale remote-tracking branches.
// It returns the remote-tracking ref names that were pruned (e.g. "origin/feature/old").
func FetchPrune(worktreePath string) ([]string, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return nil, err
	}

	stdout, stderr, err := runGitCapture(dir, fetchArgs(true)...)
	if err != nil {
		return nil, err
	}
	return parsePrunedRefs(stdout + "\n" + stderr), nil
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

// Push pushes the current branch to its upstream remote.
func Push(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, pushArgs()...)
	return err
}

// PushSetUpstream pushes the current branch and sets upstream tracking.
// remote defaults to "origin" when empty.
func PushSetUpstream(worktreePath, remote string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, pushSetUpstreamArgs(remote)...)
	return err
}

func fetchArgs(prune bool) []string {
	if prune {
		return []string{"fetch", "--prune"}
	}
	return []string{"fetch"}
}

func parsePrunedRefs(output string) []string {
	var refs []string
	seen := map[string]struct{}{}
	for _, line := range strings.Split(output, "\n") {
		if !strings.Contains(line, "[deleted]") {
			continue
		}
		_, after, ok := strings.Cut(line, "->")
		if !ok {
			continue
		}
		ref := strings.TrimSpace(after)
		if ref == "" {
			continue
		}
		if _, exists := seen[ref]; exists {
			continue
		}
		seen[ref] = struct{}{}
		refs = append(refs, ref)
	}
	return refs
}

func pullArgs() []string {
	return []string{"pull"}
}

func pushArgs() []string {
	return []string{"push"}
}

func pushSetUpstreamArgs(remote string) []string {
	remote = strings.TrimSpace(remote)
	if remote == "" {
		remote = "origin"
	}
	return []string{"push", "-u", remote, "HEAD"}
}
