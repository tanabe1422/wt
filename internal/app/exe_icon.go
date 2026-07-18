package app

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var errEmptyExecutable = errors.New("実行ファイルのパスが空です")

// GetExecutableIconDataURL returns a PNG data URL for the executable's icon.
// On non-Windows platforms, or when extraction fails, it returns an empty string.
func (a *App) GetExecutableIconDataURL(commandOrPath string) (string, error) {
	return executableIconDataURL(commandOrPath)
}

func resolveExecutablePath(commandOrPath string) (string, error) {
	commandOrPath = strings.TrimSpace(commandOrPath)
	if commandOrPath == "" {
		return "", errEmptyExecutable
	}
	if resolved, err := exec.LookPath(commandOrPath); err == nil {
		return resolved, nil
	}
	abs, err := filepath.Abs(filepath.Clean(commandOrPath))
	if err != nil {
		return "", err
	}
	return abs, nil
}

func isDirectIconSource(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".exe", ".dll", ".ico":
		return true
	default:
		return false
	}
}

// preferIconExecutable finds a real .exe when LookPath returned a shim
// (cursor.cmd, extension-less "cursor", code.cmd, …).
// Cursor lives at <root>/Cursor.exe while the shim is under
// <root>/resources/app/bin/, so we walk several parents.
func preferIconExecutable(path string) string {
	if isDirectIconSource(path) {
		return path
	}

	dir := filepath.Dir(path)
	baseName := filepath.Base(path)
	ext := filepath.Ext(baseName)
	base := strings.TrimSuffix(baseName, ext)
	if base == "" {
		return path
	}
	title := strings.ToUpper(base[:1]) + base[1:]

	names := []string{
		base + ".exe",
		title + ".exe",
		"Cursor.exe",
		"Code.exe",
		"Zed.exe",
	}

	curr := dir
	for range 6 {
		for _, name := range names {
			candidate := filepath.Join(curr, name)
			abs, err := filepath.Abs(candidate)
			if err != nil {
				continue
			}
			info, err := os.Stat(abs)
			if err == nil && !info.IsDir() {
				return abs
			}
		}
		parent := filepath.Dir(curr)
		if parent == curr {
			break
		}
		curr = parent
	}
	return path
}
