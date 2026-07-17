package git

import (
	"os/exec"
	"strings"
	"testing"
)

func TestApplyNonInteractiveEnv(t *testing.T) {
	cmd := exec.Command("git", "version")
	applyNonInteractiveEnv(cmd)
	if len(cmd.Env) == 0 {
		t.Fatal("expected Env to be set")
	}

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
	if _, ok := got["GIT_ASKPASS"]; !ok {
		t.Fatal("expected GIT_ASKPASS to be set")
	}
	if got["GIT_ASKPASS"] != "" {
		t.Fatalf("GIT_ASKPASS=%q want empty", got["GIT_ASKPASS"])
	}
}

func TestSetProcessContextNilResets(t *testing.T) {
	prev := cmdContext()
	t.Cleanup(func() { SetProcessContext(prev) })

	SetProcessContext(nil)
	if cmdContext() == nil {
		t.Fatal("cmdContext must not be nil after SetProcessContext(nil)")
	}
}
