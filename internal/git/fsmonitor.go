package git

import (
	"runtime"
	"strings"
)

// FsMonitorState is the builtin FSMonitor + untrackedCache preference for a repo.
type FsMonitorState struct {
	Supported bool `json:"supported"`
	Enabled   bool `json:"enabled"`
}

// FsMonitorSupported reports whether Git's builtin FSMonitor is available on this OS.
// Builtin daemon is currently Windows and macOS only.
func FsMonitorSupported() bool {
	return runtime.GOOS == "windows" || runtime.GOOS == "darwin"
}

// GetFsMonitorState reads core.fsmonitor for the repository at dir.
func GetFsMonitorState(dir string) (FsMonitorState, error) {
	state := FsMonitorState{Supported: FsMonitorSupported()}
	if strings.TrimSpace(dir) == "" {
		return state, nil
	}
	enabled, err := gitConfigBool(dir, "core.fsmonitor")
	if err != nil {
		return FsMonitorState{}, err
	}
	state.Enabled = enabled
	return state, nil
}

// SetFsMonitorEnabled enables or disables core.fsmonitor and core.untrackedCache.
// Daemon start/stop is best-effort; config is the source of truth for subsequent git commands.
func SetFsMonitorEnabled(dir string, enabled bool) error {
	if strings.TrimSpace(dir) == "" {
		return nil
	}
	value := "false"
	if enabled {
		value = "true"
	}
	if _, err := runGit(dir, "config", "core.fsmonitor", value); err != nil {
		return err
	}
	if _, err := runGit(dir, "config", "core.untrackedCache", value); err != nil {
		return err
	}
	if enabled {
		_, _ = runGit(dir, "fsmonitor--daemon", "start")
	} else {
		_, _ = runGit(dir, "fsmonitor--daemon", "stop")
	}
	return nil
}

func gitConfigBool(dir, key string) (bool, error) {
	out, err := runGit(dir, "config", "--bool", "--get", key)
	if err != nil {
		// unset / not found → false
		return false, nil
	}
	return strings.EqualFold(strings.TrimSpace(out), "true"), nil
}
