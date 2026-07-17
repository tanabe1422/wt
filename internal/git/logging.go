package git

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"wt-manager/internal/config"
)

const maxLogCaptureBytes = 8 * 1024

var (
	loggingMu      sync.RWMutex
	loggingEnabled bool
	logWriteMu     sync.Mutex
)

// SetLoggingEnabled turns git command + GIT_TRACE file logging on or off.
func SetLoggingEnabled(enabled bool) {
	loggingMu.Lock()
	defer loggingMu.Unlock()
	loggingEnabled = enabled
}

// LoggingEnabled reports whether git logging is currently on.
func LoggingEnabled() bool {
	loggingMu.RLock()
	defer loggingMu.RUnlock()
	return loggingEnabled
}

// LogsDir returns the directory used for git log files.
func LogsDir() (string, error) {
	return config.LogsDir()
}

// EnsureLogsDir creates the logs directory if needed and returns its path.
func EnsureLogsDir() (string, error) {
	dir, err := LogsDir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func dailyLogPath(prefix string) (string, error) {
	dir, err := EnsureLogsDir()
	if err != nil {
		return "", err
	}
	name := fmt.Sprintf("%s-%s.log", prefix, time.Now().Format("20060102"))
	return filepath.Join(dir, name), nil
}

func loggingEnvOverrides() []string {
	if !LoggingEnabled() {
		return nil
	}
	tracePath, err := dailyLogPath("git-trace")
	if err != nil {
		return nil
	}
	// Absolute path keeps GIT_TRACE off stderr so --progress parsing stays clean.
	return []string{
		"GIT_TRACE=" + tracePath,
		"GIT_TRACE_PERFORMANCE=" + tracePath,
	}
}

func logGitCommand(dir string, args []string, elapsed time.Duration, runErr error, stdout, stderr string) {
	if !LoggingEnabled() {
		return
	}
	path, err := dailyLogPath("git")
	if err != nil {
		return
	}

	var b strings.Builder
	b.WriteString("=== ")
	b.WriteString(time.Now().Format(time.RFC3339))
	b.WriteString(" ===\n")
	b.WriteString("dir: ")
	b.WriteString(dir)
	b.WriteString("\n")
	b.WriteString("cmd: git ")
	b.WriteString(strings.Join(args, " "))
	b.WriteString("\n")
	b.WriteString(fmt.Sprintf("duration: %s\n", elapsed.Round(time.Millisecond)))
	if runErr != nil {
		b.WriteString("error: ")
		b.WriteString(runErr.Error())
		b.WriteString("\n")
	} else {
		b.WriteString("ok\n")
	}
	if s := truncateForLog(stdout); s != "" {
		b.WriteString("--- stdout ---\n")
		b.WriteString(s)
		if !strings.HasSuffix(s, "\n") {
			b.WriteByte('\n')
		}
	}
	if s := truncateForLog(stderr); s != "" {
		b.WriteString("--- stderr ---\n")
		b.WriteString(s)
		if !strings.HasSuffix(s, "\n") {
			b.WriteByte('\n')
		}
	}
	b.WriteByte('\n')

	logWriteMu.Lock()
	defer logWriteMu.Unlock()
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.WriteString(b.String())
}

func truncateForLog(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if len(s) <= maxLogCaptureBytes {
		return s
	}
	return s[:maxLogCaptureBytes] + "\n... (truncated)"
}
