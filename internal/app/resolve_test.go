package app

import (
	"path/filepath"
	"testing"
)

func TestWithWorktreeEmptyPath(t *testing.T) {
	err := withWorktree("", func(dir string) error {
		t.Fatal("callback should not run")
		return nil
	})
	if err == nil {
		t.Fatal("expected error for empty worktree path")
	}
}

func TestWithWorktreeNonRepo(t *testing.T) {
	clearRepoRootCacheForTests()
	t.Cleanup(clearRepoRootCacheForTests)

	err := withWorktree(t.TempDir(), func(dir string) error {
		t.Fatal("callback should not run for non-repo")
		return nil
	})
	if err == nil {
		t.Fatal("expected error for non-repo path")
	}
}

func TestResolveRepoRootNonRepo(t *testing.T) {
	clearRepoRootCacheForTests()
	t.Cleanup(clearRepoRootCacheForTests)

	_, err := resolveRepoRoot(filepath.Join(t.TempDir(), "not-a-repo"))
	if err == nil {
		t.Fatal("expected error for non-repo directory")
	}
}

func TestTryResolveRepoRootNonRepo(t *testing.T) {
	clearRepoRootCacheForTests()
	t.Cleanup(clearRepoRootCacheForTests)

	root, ok, err := tryResolveRepoRoot(filepath.Join(t.TempDir(), "nope"))
	if err == nil {
		t.Fatal("expected error for non-repo")
	}
	if ok || root != "" {
		t.Fatalf("expected no root, got ok=%v root=%q", ok, root)
	}
}

func TestListFromRepoNonRepo(t *testing.T) {
	clearRepoRootCacheForTests()
	t.Cleanup(clearRepoRootCacheForTests)

	_, err := listFromRepo(filepath.Join(t.TempDir(), "nope"), func(string) ([]string, error) {
		t.Fatal("callback should not run")
		return nil, nil
	})
	if err == nil {
		t.Fatal("expected error for non-repo")
	}
}

func TestResolveWorktreePathCacheHit(t *testing.T) {
	clearRepoRootCacheForTests()
	t.Cleanup(clearRepoRootCacheForTests)

	dir := t.TempDir()
	abs, err := filepath.Abs(filepath.Clean(dir))
	if err != nil {
		t.Fatal(err)
	}
	repoRootByPath.Store(abs, abs)

	got, err := resolveWorktreePath(dir)
	if err != nil {
		t.Fatalf("resolveWorktreePath cache hit: %v", err)
	}
	if got != abs {
		t.Fatalf("got %q want %q", got, abs)
	}
}

func TestPing(t *testing.T) {
	a := New()
	if got := a.Ping(); got != "pong" {
		t.Fatalf("Ping()=%q want pong", got)
	}
}
