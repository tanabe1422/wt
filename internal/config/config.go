package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Settings struct {
	Repositories     []string `json:"repositories"`
	ActiveRepository string   `json:"activeRepository"`
}

func configPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "wt-manager", "config.json"), nil
}

func normalizePath(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return "", err
	}
	return abs, nil
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
