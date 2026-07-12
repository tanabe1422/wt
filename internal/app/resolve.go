package app

import (
	"errors"
	"path/filepath"

	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

func resolveWorktreePath(worktreePath string) (string, error) {
	if worktreePath == "" {
		return "", errors.New("ワークツリーが選択されていません")
	}
	abs, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return "", err
	}
	repoInfo, err := git.ResolveRepo(abs)
	if err != nil {
		return "", err
	}
	if !repoInfo.IsRepo {
		return "", errors.New("Git リポジトリではありません")
	}
	return abs, nil
}

// tryResolveRepoRoot resolves a repository root. When no path is selected it
// returns ("", false, nil) so list APIs can return an empty slice.
func tryResolveRepoRoot(repoPath string) (string, bool, error) {
	if repoPath == "" {
		settings, err := config.Load()
		if err != nil {
			return "", false, err
		}
		repoPath = settings.ActiveRepository
	}
	if repoPath == "" {
		return "", false, nil
	}

	abs, err := filepath.Abs(filepath.Clean(repoPath))
	if err != nil {
		return "", false, err
	}

	repoInfo, err := git.ResolveRepo(abs)
	if err != nil {
		return "", false, err
	}
	if !repoInfo.IsRepo {
		return "", false, errors.New("Git リポジトリではありません")
	}
	return repoInfo.RepoRoot, true, nil
}

func resolveRepoRoot(repoPath string) (string, error) {
	root, ok, err := tryResolveRepoRoot(repoPath)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", errors.New("リポジトリが選択されていません")
	}
	return root, nil
}

func withWorktree(worktreePath string, fn func(dir string) error) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return fn(dir)
}

func withWorktreeResult[T any](worktreePath string, fn func(dir string) (T, error)) (T, error) {
	var zero T
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return zero, err
	}
	return fn(dir)
}

func listFromRepo[T any](repoPath string, fn func(string) ([]T, error)) ([]T, error) {
	root, ok, err := tryResolveRepoRoot(repoPath)
	if err != nil {
		return nil, err
	}
	if !ok {
		return []T{}, nil
	}
	return fn(root)
}
