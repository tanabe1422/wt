package app

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

func openTerminal(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return errors.New("not a directory")
	}

	switch runtime.GOOS {
	case "windows":
		if _, err := exec.LookPath("wt.exe"); err == nil {
			return exec.Command("wt", "-d", path).Start()
		}
		return exec.Command(
			"cmd", "/c", "start", "cmd", "/K",
			fmt.Sprintf("cd /d %s", strconv.Quote(path)),
		).Start()
	case "darwin":
		escaped := strings.ReplaceAll(path, `\`, `\\`)
		escaped = strings.ReplaceAll(escaped, `"`, `\"`)
		script := fmt.Sprintf(
			`tell application "Terminal" to do script "cd \"%s\"; clear"`,
			escaped,
		)
		return exec.Command("osascript", "-e", script).Start()
	default:
		candidates := [][]string{
			{"wt", "-d", path},
			{"gnome-terminal", "--working-directory=" + path},
			{"konsole", "--workdir", path},
			{"xfce4-terminal", "--working-directory=" + path},
		}
		for _, args := range candidates {
			if _, err := exec.LookPath(args[0]); err != nil {
				continue
			}
			return exec.Command(args[0], args[1:]...).Start()
		}
		shellQuote := strconv.Quote(path)
		if _, err := exec.LookPath("xterm"); err == nil {
			return exec.Command("xterm", "-e", "bash", "-lc",
				fmt.Sprintf("cd %s; exec bash", shellQuote),
			).Start()
		}
		return errors.New("no terminal emulator found")
	}
}

// OpenTerminal opens a new terminal window at the given directory path.
func (a *App) OpenTerminal(path string) error {
	abs, err := filepath.Abs(filepath.Clean(path))
	if err != nil {
		return err
	}
	return openTerminal(abs)
}
