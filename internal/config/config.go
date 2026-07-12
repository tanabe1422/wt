package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// ExternalTool describes how to launch an external diff or merge app.
type ExternalTool struct {
	Preset string `json:"preset"` // vscode | winmerge | beyondcompare | custom
	Path   string `json:"path"`
	Args   string `json:"args"`
}

type Settings struct {
	Repositories     []string     `json:"repositories"`
	ActiveRepository string       `json:"activeRepository"`
	DiffTool         ExternalTool `json:"diffTool"`
	MergeTool        ExternalTool `json:"mergeTool"`
}

func configPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "wt-manager", "config.json"), nil
}

func normalizePath(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", nil
	}
	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return "", err
	}
	return abs, nil
}

func normalizeExternalTool(tool ExternalTool) ExternalTool {
	preset := strings.TrimSpace(tool.Preset)
	if preset == "" {
		preset = "custom"
	}
	path := strings.TrimSpace(tool.Path)
	args := strings.TrimSpace(tool.Args)

	// WinMerge /flags are converted to drive paths by git's MSYS shell (/e → E:\).
	if preset == "winmerge" && hasSlashFlag(args) {
		if strings.Contains(args, "$BASE") || strings.Contains(args, "$MERGED") {
			args = `-e -u "$LOCAL" "$BASE" "$REMOTE" -o "$MERGED"`
		} else {
			args = `-e -u -wl "$LOCAL" "$REMOTE"`
		}
	}

	return ExternalTool{
		Preset: preset,
		Path:   path,
		Args:   args,
	}
}

func hasSlashFlag(args string) bool {
	for _, part := range strings.Fields(args) {
		if len(part) >= 2 && part[0] == '/' && ((part[1] >= 'a' && part[1] <= 'z') || (part[1] >= 'A' && part[1] <= 'Z')) {
			return true
		}
	}
	return false
}

func Load() (Settings, error) {
	path, err := configPath()
	if err != nil {
		return Settings{}, err
	}

	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return normalizeSettings(Settings{})
	}
	if err != nil {
		return Settings{}, err
	}

	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return Settings{}, err
	}

	return normalizeSettings(settings)
}

func Save(settings Settings) error {
	normalized, err := normalizeSettings(settings)
	if err != nil {
		return err
	}

	path, err := configPath()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(normalized, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0o644)
}

func normalizeSettings(settings Settings) (Settings, error) {
	seen := make(map[string]struct{})
	repositories := make([]string, 0, len(settings.Repositories))

	for _, repo := range settings.Repositories {
		normalized, err := normalizePath(repo)
		if err != nil {
			return Settings{}, err
		}
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		repositories = append(repositories, normalized)
	}

	active, err := normalizePath(settings.ActiveRepository)
	if err != nil {
		return Settings{}, err
	}

	activeStillExists := false
	for _, repo := range repositories {
		if repo == active {
			activeStillExists = true
			break
		}
	}

	if !activeStillExists {
		if len(repositories) > 0 {
			active = repositories[0]
		} else {
			active = ""
		}
	}

	return Settings{
		Repositories:     repositories,
		ActiveRepository: active,
		DiffTool:         normalizeExternalTool(settings.DiffTool),
		MergeTool:        normalizeExternalTool(settings.MergeTool),
	}, nil
}

func AddRepository(settings Settings, path string) (Settings, error) {
	normalized, err := normalizePath(path)
	if err != nil {
		return Settings{}, err
	}
	if normalized == "" {
		return settings, nil
	}

	for _, repo := range settings.Repositories {
		if repo == normalized {
			settings.ActiveRepository = normalized
			return normalizeSettings(settings)
		}
	}

	settings.Repositories = append(settings.Repositories, normalized)
	settings.ActiveRepository = normalized

	return normalizeSettings(settings)
}

func RemoveRepository(settings Settings, path string) (Settings, error) {
	normalized, err := normalizePath(path)
	if err != nil {
		return Settings{}, err
	}

	filtered := make([]string, 0, len(settings.Repositories))
	for _, repo := range settings.Repositories {
		if repo != normalized {
			filtered = append(filtered, repo)
		}
	}
	settings.Repositories = filtered

	if settings.ActiveRepository == normalized {
		settings.ActiveRepository = ""
	}

	return normalizeSettings(settings)
}

func SetActiveRepository(settings Settings, path string) (Settings, error) {
	normalized, err := normalizePath(path)
	if err != nil {
		return Settings{}, err
	}

	for _, repo := range settings.Repositories {
		if repo == normalized {
			settings.ActiveRepository = normalized
			return normalizeSettings(settings)
		}
	}

	return normalizeSettings(settings)
}
