package app

import "wt-manager/internal/git"

// GetGitDebugSnapshot returns in-flight and recent git commands for the debug window.
func (a *App) GetGitDebugSnapshot() git.GitDebugSnapshot {
	return git.ListGitDebugSnapshot()
}
