package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoggingEnvOverridesWhenDisabled(t *testing.T) {
	prev := LoggingEnabled()
	t.Cleanup(func() { SetLoggingEnabled(prev) })
	SetLoggingEnabled(false)

	if got := loggingEnvOverrides(); got != nil {
		t.Fatalf("loggingEnvOverrides()=%v want nil", got)
	}
}

func TestApplyNonInteractiveEnvIncludesTraceWhenEnabled(t *testing.T) {
	prev := LoggingEnabled()
	t.Cleanup(func() { SetLoggingEnabled(prev) })
	SetLoggingEnabled(true)

	cmd := exec.Command("git", "version")
	applyNonInteractiveEnv(cmd)

	got := map[string]string{}
	for _, kv := range cmd.Env {
		key, val, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		got[key] = val
	}
	if got["GIT_TERMINAL_PROMPT"] != "0" {
		t.Fatalf("GIT_TERMINAL_PROMPT=%q want 0", got["GIT_TERMINAL_PROMPT"])
	}
	trace := got["GIT_TRACE"]
	if trace == "" || !filepath.IsAbs(trace) {
		t.Fatalf("GIT_TRACE=%q want absolute path", trace)
	}
	if !strings.Contains(filepath.Base(trace), "git-trace-") {
		t.Fatalf("GIT_TRACE basename=%q want git-trace-*", filepath.Base(trace))
	}
	if got["GIT_TRACE_PERFORMANCE"] != trace {
		t.Fatalf("GIT_TRACE_PERFORMANCE=%q want same as GIT_TRACE", got["GIT_TRACE_PERFORMANCE"])
	}
}

func TestLogGitCommandWritesFile(t *testing.T) {
	prev := LoggingEnabled()
	t.Cleanup(func() { SetLoggingEnabled(prev) })
	SetLoggingEnabled(true)

	dir, err := EnsureLogsDir()
	if err != nil {
		t.Fatal(err)
	}
	path, err := dailyLogPath("git")
	if err != nil {
		t.Fatal(err)
	}
	_ = os.Remove(path)

	logGitCommand(dir, []string{"status", "--porcelain"}, 0, nil, " M a.txt", "")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if !strings.Contains(text, "cmd: git status --porcelain") {
		t.Fatalf("log missing command: %s", text)
	}
	if !strings.Contains(text, "ok") {
		t.Fatalf("log missing ok: %s", text)
	}
}

func TestTruncateForLog(t *testing.T) {
	if truncateForLog("") != "" {
		t.Fatal("empty should stay empty")
	}
	if truncateForLog(" hi ") != "hi" {
		t.Fatal("should trim")
	}
	long := strings.Repeat("a", maxLogCaptureBytes+10)
	got := truncateForLog(long)
	if !strings.HasSuffix(got, "... (truncated)") {
		t.Fatalf("expected truncation marker, got len=%d", len(got))
	}
}
