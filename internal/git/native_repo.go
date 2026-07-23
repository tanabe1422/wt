package git

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// nativeIsUntracked reports whether file exists on disk and is absent from the index.
// Ignore rules are not re-checked (GetStatus already filters with --exclude-standard).
func nativeIsUntracked(dir, file string) (bool, error) {
	return withNativeRepoResult(dir, func(repo *gogit.Repository) (bool, error) {
		idx, err := repo.Storer.Index()
		if err != nil {
			return false, err
		}
		rel := filepath.ToSlash(filepath.Clean(file))
		rel = strings.TrimPrefix(rel, "./")
		if _, err := idx.Entry(rel); err == nil {
			return false, nil
		}
		abs := filepath.Join(dir, filepath.FromSlash(rel))
		fi, err := os.Stat(abs)
		if err != nil || fi.IsDir() {
			return false, nil
		}
		return true, nil
	})
}

// nativeGitDir resolves the worktree's git directory (handles `.git` file for linked worktrees).
func nativeGitDir(worktreePath string) (string, error) {
	abs, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return "", err
	}
	dotGit := filepath.Join(abs, ".git")
	fi, err := os.Stat(dotGit)
	if err != nil {
		return "", err
	}
	if fi.IsDir() {
		return dotGit, nil
	}
	data, err := os.ReadFile(dotGit)
	if err != nil {
		return "", err
	}
	line := strings.TrimSpace(string(data))
	const prefix = "gitdir:"
	if len(line) < len(prefix) || !strings.EqualFold(line[:len(prefix)], prefix) {
		return "", errors.New("invalid .git file")
	}
	gitdir := strings.TrimSpace(line[len(prefix):])
	if gitdir == "" {
		return "", errors.New("invalid .git file")
	}
	if !filepath.IsAbs(gitdir) {
		gitdir = filepath.Join(abs, gitdir)
	}
	return filepath.Clean(gitdir), nil
}

func nativeHasGitFile(worktreePath, name string) (bool, error) {
	gitDir, err := nativeGitDir(worktreePath)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(filepath.Join(gitDir, name))
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func nativeIsOnBranch(dir string) (bool, error) {
	return withNativeRepoResult(dir, func(repo *gogit.Repository) (bool, error) {
		head, err := repo.Head()
		if err != nil {
			return false, err
		}
		return head.Name().IsBranch(), nil
	})
}

// nativeUpstreamShortName returns "remote/branch" like
// `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`.
func nativeUpstreamShortName(dir string) (string, error) {
	return withNativeRepoResult(dir, func(repo *gogit.Repository) (string, error) {
		cfg, err := repo.Config()
		if err != nil {
			return "", err
		}
		head, err := repo.Head()
		if err != nil {
			return "", err
		}
		if !head.Name().IsBranch() {
			return "", errors.New("upstream が設定されていません")
		}
		branch := head.Name().Short()
		b := cfg.Branches[branch]
		if b == nil || b.Remote == "" || b.Merge == "" {
			return "", errors.New("upstream が設定されていません")
		}
		mergeShort := strings.TrimPrefix(b.Merge.String(), "refs/heads/")
		if mergeShort == "" {
			return "", errors.New("upstream の形式が不正です")
		}
		return b.Remote + "/" + mergeShort, nil
	})
}

// nativeAheadOfUpstream counts commits reachable from HEAD but not from upstream.
// hasUpstream is false when no upstream is configured (amend should not block).
func nativeAheadOfUpstream(dir string) (ahead int, hasUpstream bool, err error) {
	type result struct {
		ahead       int
		hasUpstream bool
	}
	out, err := withNativeRepoResult(dir, func(repo *gogit.Repository) (result, error) {
		cfg, err := repo.Config()
		if err != nil {
			return result{}, err
		}
		head, err := repo.Head()
		if err != nil {
			return result{}, err
		}
		if !head.Name().IsBranch() {
			return result{}, nil
		}
		branch := head.Name().Short()
		b := cfg.Branches[branch]
		if b == nil || b.Remote == "" || b.Merge == "" {
			return result{}, nil
		}
		mergeShort := strings.TrimPrefix(b.Merge.String(), "refs/heads/")
		remoteRef, err := repo.Reference(plumbing.NewRemoteReferenceName(b.Remote, mergeShort), true)
		if err != nil {
			return result{}, nil
		}
		ahead, err := countExclusiveCommits(repo, head.Hash(), remoteRef.Hash())
		if err != nil {
			return result{hasUpstream: true}, err
		}
		return result{ahead: ahead, hasUpstream: true}, nil
	})
	return out.ahead, out.hasUpstream, err
}

func nativeHeadCommitMessage(dir string) (string, error) {
	return withNativeRepoResult(dir, func(repo *gogit.Repository) (string, error) {
		head, err := repo.Head()
		if err != nil {
			return "", err
		}
		commit, err := repo.CommitObject(head.Hash())
		if err != nil {
			return "", err
		}
		return strings.TrimRight(commit.Message, "\r\n"), nil
	})
}

func nativeHasHEAD(dir string) bool {
	ok, err := withNativeRepoResult(dir, func(repo *gogit.Repository) (bool, error) {
		_, err := repo.Head()
		return err == nil, nil
	})
	return err == nil && ok
}

func openNativeRepo(path string) (*gogit.Repository, error) {
	recordGoGitStart()
	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return nil, err
	}

	now := time.Now()
	nativeRepoMu.Lock()
	if entry, ok := nativeRepoCache[abs]; ok && now.Before(entry.expireAt) {
		repo := entry.repo
		nativeRepoMu.Unlock()
		return repo, nil
	}
	nativeRepoMu.Unlock()

	// EnableDotGitCommonDir is required for linked worktrees, whose .git is a
	// file pointing at .git/worktrees/<name>. Refs, config, and objects live in
	// the common dir; without this option ListBranchHeads/upstream resolve fail.
	repo, err := gogit.PlainOpenWithOptions(abs, &gogit.PlainOpenOptions{
		DetectDotGit:          true,
		EnableDotGitCommonDir: true,
	})
	if err != nil {
		return nil, err
	}

	nativeRepoMu.Lock()
	defer nativeRepoMu.Unlock()
	if entry, ok := nativeRepoCache[abs]; ok && time.Now().Before(entry.expireAt) {
		return entry.repo, nil
	}
	if len(nativeRepoCache) >= nativeRepoCacheMax {
		clearNativeRepoCacheLocked()
	}
	nativeRepoCache[abs] = &nativeRepoCacheEntry{
		repo:     repo,
		expireAt: time.Now().Add(nativeRepoCacheTTL),
	}
	return repo, nil
}

// withNativeRepo serializes use of cached *gogit.Repository values.
// go-git's Repository is not safe for concurrent use; branch switch + history
// reload otherwise race ListBranches / ListBranchHeads on the same handle.
func withNativeRepo(path string, fn func(*gogit.Repository) error) error {
	nativeRepoOpMu.Lock()
	defer nativeRepoOpMu.Unlock()
	repo, err := openNativeRepo(path)
	if err != nil {
		return err
	}
	return fn(repo)
}

func withNativeRepoResult[T any](path string, fn func(*gogit.Repository) (T, error)) (T, error) {
	var zero T
	nativeRepoOpMu.Lock()
	defer nativeRepoOpMu.Unlock()
	repo, err := openNativeRepo(path)
	if err != nil {
		return zero, err
	}
	return fn(repo)
}

type nativeRepoCacheEntry struct {
	repo     *gogit.Repository
	expireAt time.Time
}

const (
	nativeRepoCacheTTL = 3 * time.Second
	nativeRepoCacheMax = 8
)

var (
	nativeRepoMu    sync.Mutex
	nativeRepoOpMu  sync.Mutex
	nativeRepoCache = map[string]*nativeRepoCacheEntry{}
)

// InvalidateNativeRepoCache drops all cached go-git Repository handles.
// Call after mutating operations so subsequent reads reopen fresh state.
func InvalidateNativeRepoCache() {
	nativeRepoMu.Lock()
	defer nativeRepoMu.Unlock()
	clearNativeRepoCacheLocked()
}

func clearNativeRepoCacheLocked() {
	nativeRepoCache = map[string]*nativeRepoCacheEntry{}
}

func nativeWorktreeRoot(path string) (string, error) {
	return withNativeRepoResult(path, func(repo *gogit.Repository) (string, error) {
		wt, err := repo.Worktree()
		if err != nil {
			return "", err
		}
		type rootFS interface {
			Root() string
		}
		fs, ok := wt.Filesystem.(rootFS)
		if !ok {
			return "", errors.New("worktree filesystem has no Root()")
		}
		return filepath.Clean(fs.Root()), nil
	})
}

func nativeCurrentBranch(dir string) (string, error) {
	return withNativeRepoResult(dir, func(repo *gogit.Repository) (string, error) {
		ref, err := repo.Head()
		if err != nil {
			return "", err
		}
		if ref.Name().IsBranch() {
			return ref.Name().Short(), nil
		}
		return "HEAD", nil
	})
}

func nativeListBranchesMeta(repoPath string) ([]BranchEntry, error) {
	return withNativeRepoResult(repoPath, func(repo *gogit.Repository) ([]BranchEntry, error) {
		cfg, err := repo.Config()
		if err != nil {
			return nil, err
		}

		headName := ""
		if head, err := repo.Head(); err == nil && head.Name().IsBranch() {
			headName = head.Name().Short()
		}

		refs, err := repo.References()
		if err != nil {
			return nil, err
		}

		entries := make([]BranchEntry, 0)
		err = refs.ForEach(func(ref *plumbing.Reference) error {
			name := ref.Name()
			switch {
			case name.IsBranch():
				short := name.Short()
				if short == "" {
					return nil
				}
				upstream := ""
				if b := cfg.Branches[short]; b != nil && b.Remote != "" && b.Merge != "" {
					mergeShort := strings.TrimPrefix(b.Merge.String(), "refs/heads/")
					if mergeShort != "" {
						upstream = b.Remote + "/" + mergeShort
					}
				}
				entries = append(entries, BranchEntry{
					Name:        short,
					IsCurrent:   short == headName,
					IsRemote:    false,
					HasUpstream: upstream != "",
				})
			case name.IsRemote():
				short := name.Short()
				if short == "" || strings.HasSuffix(short, "/HEAD") {
					return nil
				}
				entries = append(entries, BranchEntry{
					Name:      short,
					IsCurrent: false,
					IsRemote:  true,
				})
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
		return entries, nil
	})
}

func nativeCountAheadBehind(repoPath, branch string) (ahead, behind int, err error) {
	type result struct {
		ahead  int
		behind int
	}
	out, err := withNativeRepoResult(repoPath, func(repo *gogit.Repository) (result, error) {
		cfg, err := repo.Config()
		if err != nil {
			return result{}, err
		}
		b := cfg.Branches[branch]
		if b == nil || b.Remote == "" || b.Merge == "" {
			return result{}, fmt.Errorf("no upstream configured for branch %q", branch)
		}

		localRef, err := repo.Reference(plumbing.NewBranchReferenceName(branch), true)
		if err != nil {
			return result{}, err
		}

		mergeShort := strings.TrimPrefix(b.Merge.String(), "refs/heads/")
		remoteRef, err := repo.Reference(plumbing.NewRemoteReferenceName(b.Remote, mergeShort), true)
		if err != nil {
			return result{}, err
		}

		// left = upstream-only (behind), right = branch-only (ahead)
		behind, err := countExclusiveCommits(repo, remoteRef.Hash(), localRef.Hash())
		if err != nil {
			return result{}, err
		}
		ahead, err := countExclusiveCommits(repo, localRef.Hash(), remoteRef.Hash())
		if err != nil {
			return result{}, err
		}
		return result{ahead: ahead, behind: behind}, nil
	})
	return out.ahead, out.behind, err
}

// countExclusiveCommits returns commits reachable from include but not from exclude
// (same idea as `git rev-list --count include --not exclude`).
func countExclusiveCommits(repo *gogit.Repository, include, exclude plumbing.Hash) (int, error) {
	if include == exclude {
		return 0, nil
	}

	exc, err := repo.CommitObject(exclude)
	if err != nil {
		return 0, err
	}
	seen := map[plumbing.Hash]bool{}
	eiter := object.NewCommitPreorderIter(exc, nil, nil)
	if err := eiter.ForEach(func(c *object.Commit) error {
		seen[c.Hash] = true
		return nil
	}); err != nil {
		return 0, err
	}

	inc, err := repo.CommitObject(include)
	if err != nil {
		return 0, err
	}
	count := 0
	iiter := object.NewCommitPreorderIter(inc, seen, nil)
	if err := iiter.ForEach(func(c *object.Commit) error {
		count++
		return nil
	}); err != nil {
		return 0, err
	}
	return count, nil
}

func nativeListBranchHeads(worktreePath string) ([]BranchHead, error) {
	return withNativeRepoResult(worktreePath, func(repo *gogit.Repository) ([]BranchHead, error) {
		refs, err := repo.References()
		if err != nil {
			return nil, err
		}

		heads := make([]BranchHead, 0)
		err = refs.ForEach(func(ref *plumbing.Reference) error {
			name := ref.Name()
			if !name.IsBranch() && !name.IsRemote() && !name.IsTag() {
				return nil
			}
			short := name.Short()
			if short == "" || strings.HasSuffix(short, "/HEAD") {
				return nil
			}

			sha, err := peelToCommitSHA(repo, ref)
			if err != nil || sha == "" {
				return nil
			}

			heads = append(heads, BranchHead{
				Name:     short,
				IsRemote: name.IsRemote(),
				IsTag:    name.IsTag(),
				Commit: BranchHeadCommit{
					SHA: sha,
				},
			})
			return nil
		})
		if err != nil {
			return nil, err
		}
		return heads, nil
	})
}

func peelToCommitSHA(repo *gogit.Repository, ref *plumbing.Reference) (string, error) {
	hash, err := repo.ResolveRevision(plumbing.Revision(ref.Name().String()))
	if err != nil {
		// Fallback: hash reference as-is (lightweight tag / branch).
		if ref.Type() == plumbing.HashReference {
			return ref.Hash().String(), nil
		}
		return "", err
	}
	return hash.String(), nil
}
