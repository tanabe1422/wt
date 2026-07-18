package app

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"unicode"

	"wt-manager/internal/config"
)

func findOpenApp(apps []config.OpenApp, appID string) (config.OpenApp, error) {
	appID = strings.TrimSpace(appID)
	if appID == "" {
		return config.OpenApp{}, errors.New("アプリが指定されていません")
	}
	for _, app := range apps {
		if app.ID == appID {
			return app, nil
		}
	}
	return config.OpenApp{}, fmt.Errorf("登録アプリが見つかりません: %s", appID)
}

// expandOpenAppArgs splits the template first, then substitutes {path} in each
// token so directory paths with spaces stay a single argv element.
func expandOpenAppArgs(template, dirPath string) []string {
	template = strings.TrimSpace(template)
	if template == "" {
		template = "{path}"
	}
	parts := splitQuotedArgs(template)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		out = append(out, strings.ReplaceAll(part, "{path}", dirPath))
	}
	return out
}

func splitQuotedArgs(s string) []string {
	var (
		args    []string
		current strings.Builder
		inQuote rune
		escaped bool
	)
	flush := func() {
		if current.Len() == 0 {
			return
		}
		args = append(args, current.String())
		current.Reset()
	}
	for _, r := range s {
		if escaped {
			current.WriteRune(r)
			escaped = false
			continue
		}
		// Only honor escapes inside double quotes (so Windows paths like C:\wt stay intact).
		if r == '\\' && inQuote == '"' {
			escaped = true
			continue
		}
		if inQuote != 0 {
			if r == inQuote {
				inQuote = 0
			} else {
				current.WriteRune(r)
			}
			continue
		}
		if r == '"' || r == '\'' {
			inQuote = r
			continue
		}
		if unicode.IsSpace(r) {
			flush()
			continue
		}
		current.WriteRune(r)
	}
	flush()
	return args
}

func resolveOpenCommand(app config.OpenApp, dirPath string) (string, []string, error) {
	exe := strings.TrimSpace(app.Path)
	if exe == "" {
		return "", nil, errors.New("アプリのパスが空です")
	}
	args := expandOpenAppArgs(app.Args, dirPath)
	if resolved, err := exec.LookPath(exe); err == nil {
		return resolved, args, nil
	}
	return exe, args, nil
}

func openInApp(app config.OpenApp, dirPath string) error {
	info, err := os.Stat(dirPath)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return errors.New("not a directory")
	}

	exe, args, err := resolveOpenCommand(app, dirPath)
	if err != nil {
		return err
	}
	return exec.Command(exe, args...).Start()
}

// OpenInApp launches a registered open-apps entry on the given directory.
func (a *App) OpenInApp(appID string, dirPath string) error {
	settings, err := config.Load()
	if err != nil {
		return err
	}
	app, err := findOpenApp(settings.OpenApps, appID)
	if err != nil {
		return err
	}
	abs, err := filepath.Abs(filepath.Clean(dirPath))
	if err != nil {
		return err
	}
	return openInApp(app, abs)
}
