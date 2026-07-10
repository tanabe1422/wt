package git

import (
	"os"
	"path/filepath"
	"testing"
)

func TestListWorktrees(t *testing.T) {
	repoPath := filepath.Join("..", "..", "sample-repo")
	if _, err := os.Stat(repoPath); err != nil {
		t.Skip("sample-repo not found")
	}

	entries, err := ListWorktrees(repoPath)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected at least one worktree")
	}

	var mainCount int
	for _, entry := range entries {
		if entry.IsMain {
			mainCount++
		}
		if entry.Path == "" {
			t.Fatal("worktree path should not be empty")
		}
	}
	if mainCount != 1 {
		t.Fatalf("expected exactly one main worktree, got %d", mainCount)
	}
}
