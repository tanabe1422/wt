package app

import (
	"context"
	"errors"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

// App exposes methods to the React frontend via Wails bindings.
type App struct {
	ctx context.Context
}

func New() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Shutdown(ctx context.Context) {}

// Ping is a connectivity check for the Wails bridge.
func (a *App) Ping() string {
	return "pong"
}

func (a *App) GetSettings() (config.Settings, error) {
	return config.Load()
}

func (a *App) AddRepository(path string) (config.Settings, error) {
	if path == "" {
		return config.Load()
	}

	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return config.Settings{}, err
	}

	info, err := os.Stat(abs)
	if err != nil {
		return config.Settings{}, err
	}
	if !info.IsDir() {
		return config.Settings{}, errors.New("ディレクトリを選択してください")
	}

	repoInfo, err := git.ResolveRepo(abs)
	if err != nil {
		return config.Settings{}, err
	}
	if !repoInfo.IsRepo {
		return config.Settings{}, errors.New("選択したディレクトリは Git リポジトリではありません")
	}

	settings, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	settings, err = config.AddRepository(settings, repoInfo.RepoRoot)
	if err != nil {
		return config.Settings{}, err
	}

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	return settings, nil
}

func (a *App) RemoveRepository(path string) (config.Settings, error) {
	settings, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	settings, err = config.RemoveRepository(settings, path)
	if err != nil {
		return config.Settings{}, err
	}

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	return settings, nil
}

func (a *App) SetActiveRepository(path string) (config.Settings, error) {
	settings, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	settings, err = config.SetActiveRepository(settings, path)
	if err != nil {
		return config.Settings{}, err
	}

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	return settings, nil
}

func (a *App) PickDirectory() (string, error) {
	if a.ctx == nil {
		return "", errors.New("application context is not ready")
	}

	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Git リポジトリを選択",
	})
}

func (a *App) ListBranches(repoPath string) ([]git.BranchEntry, error) {
	if repoPath == "" {
		settings, err := config.Load()
		if err != nil {
			return nil, err
		}
		repoPath = settings.ActiveRepository
	}
	if repoPath == "" {
		return []git.BranchEntry{}, nil
	}

	abs, err := filepath.Abs(filepath.Clean(repoPath))
	if err != nil {
		return nil, err
	}

	repoInfo, err := git.ResolveRepo(abs)
	if err != nil {
		return nil, err
	}
	if !repoInfo.IsRepo {
		return nil, errors.New("Git リポジトリではありません")
	}

	return git.ListBranches(repoInfo.RepoRoot)
}

func (a *App) ListWorktrees(repoPath string) ([]git.WorktreeEntry, error) {
	if repoPath == "" {
		settings, err := config.Load()
		if err != nil {
			return nil, err
		}
		repoPath = settings.ActiveRepository
	}
	if repoPath == "" {
		return []git.WorktreeEntry{}, nil
	}

	abs, err := filepath.Abs(filepath.Clean(repoPath))
	if err != nil {
		return nil, err
	}

	repoInfo, err := git.ResolveRepo(abs)
	if err != nil {
		return nil, err
	}
	if !repoInfo.IsRepo {
		return nil, errors.New("Git リポジトリではありません")
	}

	return git.ListWorktrees(repoInfo.RepoRoot)
}

func (a *App) DefaultWorktreePath(repoPath, branch string) (string, error) {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return "", err
	}
	return git.DefaultWorktreePath(repoRoot, branch)
}

func (a *App) AddWorktree(repoPath, targetPath, branch string, isRemote bool) (string, error) {
	repoRoot, err := resolveRepoRoot(repoPath)
	if err != nil {
		return "", err
	}
	return git.AddWorktree(repoRoot, targetPath, branch, isRemote)
}

func (a *App) GetStatus(worktreePath string) ([]git.FileStatus, error) {
	return resolveWorktreeGit(git.GetStatus, worktreePath)
}

func (a *App) GetFileDiff(worktreePath, file string, staged bool) (git.FileDiff, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return git.FileDiff{}, err
	}
	return git.GetFileDiff(dir, file, staged)
}

func (a *App) StageFiles(worktreePath string, paths []string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.StageFiles(dir, paths)
}

func (a *App) UnstageFiles(worktreePath string, paths []string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.UnstageFiles(dir, paths)
}

func (a *App) StageHunk(worktreePath, file string, hunkIndex int) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.StageHunk(dir, file, hunkIndex)
}

func (a *App) UnstageHunk(worktreePath, file string, hunkIndex int) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.UnstageHunk(dir, file, hunkIndex)
}

func (a *App) DiscardHunk(worktreePath, file string, hunkIndex int, staged bool) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.DiscardHunk(dir, file, hunkIndex, staged)
}

func (a *App) Commit(worktreePath, message string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.Commit(dir, message)
}

func (a *App) Fetch(worktreePath string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.Fetch(dir)
}

func (a *App) Pull(worktreePath string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.Pull(dir)
}

func (a *App) OpenMergetool(worktreePath, file string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.OpenMergetool(dir, file)
}

func (a *App) Push(worktreePath string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.Push(dir)
}

func (a *App) ListCommits(worktreePath, scope, branch string, skip, limit int) (git.ListCommitsResult, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return git.ListCommitsResult{}, err
	}
	return git.ListCommits(git.ListCommitsParams{
		WorktreePath: dir,
		Scope:        scope,
		Branch:       branch,
		Skip:         skip,
		Limit:        limit,
	})
}

func (a *App) ListBranchHeads(worktreePath string) ([]git.BranchHead, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return nil, err
	}
	return git.ListBranchHeads(dir)
}

func (a *App) ListCommitFiles(worktreePath, sha string) ([]git.CommitFileChange, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return nil, err
	}
	return git.ListCommitFiles(dir, sha)
}

func (a *App) GetCommitFileDiff(worktreePath, sha, file string) (git.FileDiff, error) {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return git.FileDiff{}, err
	}
	return git.GetCommitFileDiff(dir, sha, file)
}

func (a *App) SwitchBranch(worktreePath, branch string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.SwitchBranch(dir, branch)
}

func (a *App) CheckoutRemoteBranch(worktreePath, remoteRef string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.CheckoutRemoteBranch(dir, remoteRef)
}

func (a *App) CreateBranch(worktreePath, name string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.CreateBranch(dir, name)
}

func (a *App) DeleteBranch(worktreePath, name string, force bool) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.DeleteBranch(dir, name, force)
}

func (a *App) MergeBranch(worktreePath, source string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.MergeBranch(dir, source)
}

func (a *App) SquashMergeBranch(worktreePath, source string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.SquashMergeBranch(dir, source)
}

func (a *App) ResetToCommit(worktreePath, sha, mode string) error {
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return err
	}
	return git.ResetToCommit(dir, sha, git.ResetMode(mode))
}

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

func resolveRepoRoot(repoPath string) (string, error) {
	if repoPath == "" {
		settings, err := config.Load()
		if err != nil {
			return "", err
		}
		repoPath = settings.ActiveRepository
	}
	if repoPath == "" {
		return "", errors.New("リポジトリが選択されていません")
	}

	abs, err := filepath.Abs(filepath.Clean(repoPath))
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
	return repoInfo.RepoRoot, nil
}

func resolveWorktreeGit[T any](fn func(string) (T, error), worktreePath string) (T, error) {
	var zero T
	dir, err := resolveWorktreePath(worktreePath)
	if err != nil {
		return zero, err
	}
	return fn(dir)
}
