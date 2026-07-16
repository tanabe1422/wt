package git

import (
	"errors"
	"path/filepath"
	"strings"
	"sync"
)

var repoFetchLocks sync.Map // map[string]*sync.Mutex keyed by repo root

func fetchLockFor(repoRoot string) *sync.Mutex {
	mu, _ := repoFetchLocks.LoadOrStore(repoRoot, &sync.Mutex{})
	return mu.(*sync.Mutex)
}

func withRepoFetchLock(dir string, fn func() error) error {
	info, err := ResolveRepo(dir)
	if err != nil {
		return err
	}
	if !info.IsRepo {
		return errors.New("Git リポジトリではありません")
	}
	mu := fetchLockFor(info.RepoRoot)
	mu.Lock()
	defer mu.Unlock()
	return fn()
}

// parseUpstreamRef splits "remote/branch" from rev-parse @{upstream} output.
func parseUpstreamRef(ref string) (remote, branch string, ok bool) {
	ref = strings.TrimSpace(ref)
	idx := strings.Index(ref, "/")
	if idx <= 0 || idx >= len(ref)-1 {
		return "", "", false
	}
	return ref[:idx], ref[idx+1:], true
}

func currentUpstream(dir string) (remote, branch string, err error) {
	out, err := runGit(dir, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
	if err != nil {
		return "", "", errors.New("upstream が設定されていません")
	}
	remote, branch, ok := parseUpstreamRef(out)
	if !ok {
		return "", "", errors.New("upstream の形式が不正です")
	}
	return remote, branch, nil
}

// Fetch fetches from the upstream remote.
func Fetch(worktreePath string) error {
	return FetchWithProgress(worktreePath, nil)
}

// FetchWithProgress fetches from the upstream remote and reports stderr progress lines.
func FetchWithProgress(worktreePath string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	return withRepoFetchLock(dir, func() error {
		_, err := runGitProgress(dir, onProgress, fetchArgs(false)...)
		return err
	})
}

// FetchCurrentUpstream fetches only the current branch's upstream ref.
func FetchCurrentUpstream(worktreePath string) error {
	return FetchCurrentUpstreamWithProgress(worktreePath, nil)
}

// FetchCurrentUpstreamWithProgress is FetchCurrentUpstream with stderr progress callbacks.
func FetchCurrentUpstreamWithProgress(worktreePath string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	return withRepoFetchLock(dir, func() error {
		remote, branch, err := currentUpstream(dir)
		if err != nil {
			return err
		}
		_, err = runGitProgress(dir, onProgress, fetchCurrentUpstreamArgs(remote, branch)...)
		return err
	})
}

// FetchPrune fetches from the upstream remote and prunes stale remote-tracking branches.
// It returns the remote-tracking ref names that were pruned (e.g. "origin/feature/old").
func FetchPrune(worktreePath string) ([]string, error) {
	return FetchPruneWithProgress(worktreePath, nil)
}

// FetchPruneWithProgress is FetchPrune with stderr progress callbacks.
func FetchPruneWithProgress(worktreePath string, onProgress ProgressFunc) ([]string, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return nil, err
	}

	var refs []string
	err = withRepoFetchLock(dir, func() error {
		stdout, stderr, innerErr := runGitProgressCapture(dir, onProgress, fetchArgs(true)...)
		if innerErr != nil {
			return innerErr
		}
		refs = parsePrunedRefs(stdout + "\n" + stderr)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return refs, nil
}

// Pull pulls from the upstream remote.
func Pull(worktreePath string) error {
	return PullWithProgress(worktreePath, nil)
}

// PullWithProgress pulls from the upstream remote and reports stderr progress lines.
func PullWithProgress(worktreePath string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGitProgress(dir, onProgress, pullArgs()...)
	return err
}

// Push pushes the current branch to its upstream remote.
func Push(worktreePath string) error {
	return PushWithProgress(worktreePath, nil)
}

// PushWithProgress pushes the current branch and reports stderr progress lines.
func PushWithProgress(worktreePath string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGitProgress(dir, onProgress, pushArgs()...)
	return err
}

// PushSetUpstream pushes the current branch and sets upstream tracking.
// remote defaults to "origin" when empty.
func PushSetUpstream(worktreePath, remote string) error {
	return PushSetUpstreamWithProgress(worktreePath, remote, nil)
}

// PushSetUpstreamWithProgress is PushSetUpstream with stderr progress callbacks.
func PushSetUpstreamWithProgress(worktreePath, remote string, onProgress ProgressFunc) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGitProgress(dir, onProgress, pushSetUpstreamArgs(remote)...)
	return err
}

func fetchArgs(prune bool) []string {
	if prune {
		return []string{"fetch", "--prune", "--progress"}
	}
	return []string{"fetch", "--progress"}
}

func fetchCurrentUpstreamArgs(remote, branch string) []string {
	return []string{"fetch", "--progress", remote, branch}
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
	return []string{"pull", "--progress"}
}

func pushArgs() []string {
	return []string{"push", "--progress"}
}

func pushSetUpstreamArgs(remote string) []string {
	remote = strings.TrimSpace(remote)
	if remote == "" {
		remote = "origin"
	}
	return []string{"push", "--progress", "-u", remote, "HEAD"}
}
