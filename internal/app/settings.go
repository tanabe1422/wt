package app

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

func (a *App) GetSettings() (config.Settings, error) {
	return config.Load()
}

func (a *App) SaveSettings(settings config.Settings) (config.Settings, error) {
	current, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	// Preserve repository list from disk; UI saves tool settings only.
	settings.Repositories = current.Repositories
	settings.ActiveRepository = current.ActiveRepository
	settings.PushAfterCommit = current.PushAfterCommit
	settings.MergeAllowFastForward = current.MergeAllowFastForward

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	git.SetLoggingEnabled(settings.EnableGitLogging)

	return config.Load()
}

func (a *App) GetGitLogsDir() (string, error) {
	return git.LogsDir()
}

func (a *App) OpenGitLogsDir() error {
	dir, err := git.EnsureLogsDir()
	if err != nil {
		return err
	}
	return showInExplorer(dir)
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

func (a *App) SetPushAfterCommit(path string, enabled bool) (config.Settings, error) {
	settings, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	settings, err = config.SetPushAfterCommit(settings, path, enabled)
	if err != nil {
		return config.Settings{}, err
	}

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	return settings, nil
}

func (a *App) SetMergeAllowFastForward(path string, enabled bool) (config.Settings, error) {
	settings, err := config.Load()
	if err != nil {
		return config.Settings{}, err
	}

	settings, err = config.SetMergeAllowFastForward(settings, path, enabled)
	if err != nil {
		return config.Settings{}, err
	}

	if err := config.Save(settings); err != nil {
		return config.Settings{}, err
	}

	return settings, nil
}

func (a *App) GetFsMonitor(repoPath string) (git.FsMonitorState, error) {
	root, ok, err := tryResolveRepoRoot(repoPath)
	if err != nil {
		return git.FsMonitorState{}, err
	}
	if !ok {
		return git.FsMonitorState{Supported: git.FsMonitorSupported()}, nil
	}
	return git.GetFsMonitorState(root)
}

func (a *App) SetFsMonitor(repoPath string, enabled bool) (git.FsMonitorState, error) {
	root, err := resolveRepoRoot(repoPath)
	if err != nil {
		return git.FsMonitorState{}, err
	}
	if err := git.SetFsMonitorEnabled(root, enabled); err != nil {
		return git.FsMonitorState{}, err
	}
	return git.GetFsMonitorState(root)
}

func (a *App) PickDirectory() (string, error) {
	if a.ctx == nil {
		return "", errors.New("application context is not ready")
	}

	return withoutSnapToDefaultButton(func() (string, error) {
		return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
			Title: "Git リポジトリを選択",
		})
	})
}

func (a *App) PickFile() (string, error) {
	if a.ctx == nil {
		return "", errors.New("application context is not ready")
	}

	return withoutSnapToDefaultButton(func() (string, error) {
		return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
			Title: "実行ファイルを選択",
			Filters: []runtime.FileFilter{
				{DisplayName: "実行ファイル", Pattern: "*.exe;*.cmd;*.bat;*"},
				{DisplayName: "すべてのファイル", Pattern: "*"},
			},
		})
	})
}
