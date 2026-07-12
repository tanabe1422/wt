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

func TestListWorktreesChangedFileCount(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-count")
	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	t.Cleanup(func() {
		_, _ = runGit(dir, "worktree", "remove", "--force", created)
	})

	dirty := filepath.Join(created, "dirty-count.txt")
	if err := os.WriteFile(dirty, []byte("x\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}

	var found bool
	for _, entry := range entries {
		if !pathsEqual(entry.Path, created) {
			continue
		}
		found = true
		if entry.ChangedFileCount < 1 {
			t.Fatalf("expected ChangedFileCount >= 1 for dirty worktree, got %d", entry.ChangedFileCount)
		}
	}
	if !found {
		t.Fatal("created worktree not found")
	}
}

func TestListWorktreesMetaSkipsStatus(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	meta, err := listWorktreesMeta(dir)
	if err != nil {
		t.Fatalf("listWorktreesMeta: %v", err)
	}
	if len(meta) == 0 {
		t.Fatal("expected at least one worktree")
	}
	for _, entry := range meta {
		if entry.ChangedFileCount != 0 {
			t.Fatalf("meta list should leave ChangedFileCount at 0, got %+v", entry)
		}
	}
}

func TestCountChangedFiles(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	n, err := countChangedFiles(dir)
	if err != nil {
		t.Fatalf("countChangedFiles clean: %v", err)
	}
	if n != 0 {
		t.Fatalf("expected 0 on clean tree, got %d", n)
	}

	name := "count-changed.txt"
	if err := os.WriteFile(filepath.Join(dir, name), []byte("y\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(filepath.Join(dir, name)) })

	n, err = countChangedFiles(dir)
	if err != nil {
		t.Fatalf("countChangedFiles dirty: %v", err)
	}
	if n != 1 {
		t.Fatalf("expected 1 changed file, got %d", n)
	}

	status, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}
	if n != len(status) {
		t.Fatalf("countChangedFiles=%d len(GetStatus)=%d", n, len(status))
	}
}
