package app

import (
	"sync"

	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

// warmActiveRepo starts local git reads for the configured active repository
// so they overlap with frontend boot. Failures are ignored; FE will retry.
func (a *App) warmActiveRepo() {
	settings, err := config.Load()
	if err != nil || settings.ActiveRepository == "" {
		return
	}
	repoPath := settings.ActiveRepository

	var (
		wg   sync.WaitGroup
		meta []git.WorktreeEntry
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		_, _ = a.ListBranches(repoPath)
	}()
	go func() {
		defer wg.Done()
		meta, _ = a.ListWorktreesMeta(repoPath)
	}()
	wg.Wait()

	wt := pickWarmWorktreePath(meta)
	if wt == "" {
		return
	}
	_, _ = a.GetStatus(wt)
}

func pickWarmWorktreePath(entries []git.WorktreeEntry) string {
	for _, entry := range entries {
		if entry.IsMain {
			return entry.Path
		}
	}
	if len(entries) == 0 {
		return ""
	}
	return entries[0].Path
}
