package git

import (
	"path/filepath"
	"testing"
)

func TestParseWorktreePorcelain(t *testing.T) {
	repoRoot := filepath.Clean(`C:/repos/sample`)

	output := "" +
		"worktree C:/repos/sample\nHEAD abc123\nbranch refs/heads/main\n\n" +
		"worktree C:/repos/sample-wt-feature\nHEAD def456\nbranch refs/heads/feature/foo\nlocked reason\n\n" +
		"worktree C:/repos/sample-detached\nHEAD 999999\ndetached\n"

	entries, err := parseWorktreePorcelain(output, repoRoot)
	if err != nil {
		t.Fatalf("parseWorktreePorcelain: %v", err)
	}
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}

	main := entries[0]
	if !main.IsMain {
		t.Fatal("first entry should be main worktree")
	}
	if main.Branch != "main" {
		t.Fatalf("main branch = %q, want main", main.Branch)
	}
	if main.Head != "abc123" {
		t.Fatalf("main head = %q, want abc123", main.Head)
	}
	if main.IsLocked {
		t.Fatal("main should not be locked")
	}

	feature := entries[1]
	if feature.Branch != "feature/foo" {
		t.Fatalf("feature branch = %q", feature.Branch)
	}
	if feature.Head != "def456" {
		t.Fatalf("feature head = %q, want def456", feature.Head)
	}
	if !feature.IsLocked {
		t.Fatal("feature worktree should be locked")
	}
	if feature.IsMain {
		t.Fatal("feature worktree should not be main")
	}

	detached := entries[2]
	if detached.Branch != "" {
		t.Fatalf("detached worktree branch = %q, want empty", detached.Branch)
	}
	if detached.Head != "999999" {
		t.Fatalf("detached head = %q, want 999999", detached.Head)
	}
}

func TestPathsEqual(t *testing.T) {
	tests := []struct {
		a, b string
		want bool
	}{
		{`C:\repo`, `C:/repo`, true},
		{`C:\repo\`, `C:\repo`, true},
		{`C:\repo`, `C:\other`, false},
	}

	for _, tc := range tests {
		if got := pathsEqual(tc.a, tc.b); got != tc.want {
			t.Fatalf("pathsEqual(%q, %q) = %v, want %v", tc.a, tc.b, got, tc.want)
		}
	}
}
