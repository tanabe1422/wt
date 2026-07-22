package git

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAnnotateBrokenWorktrees(t *testing.T) {
	dir := t.TempDir()
	main := dir
	healthy := filepath.Join(dir, "healthy")
	empty := filepath.Join(dir, "empty")
	missing := filepath.Join(dir, "missing")
	gitdirOnly := filepath.Join(dir, "gitdir-only")

	if err := os.Mkdir(healthy, 0o755); err != nil {
		t.Fatal(err)
	}
	gitdir := filepath.Join(dir, ".git", "worktrees", "healthy")
	if err := os.WriteFile(filepath.Join(healthy, ".git"), []byte("gitdir: "+gitdir+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(healthy, "file.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(empty, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(gitdirOnly, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(gitdirOnly, ".git"),
		[]byte("gitdir: "+filepath.Join(dir, ".git", "worktrees", "gitdir-only")+"\n"),
		0o644,
	); err != nil {
		t.Fatal(err)
	}

	entries := []WorktreeEntry{
		{Path: main, Branch: "main", IsMain: true},
		{Path: healthy, Branch: "feature"},
		{Path: empty, Branch: "gone"},
		{Path: missing, Branch: "absent"},
		{Path: gitdirOnly, Branch: "orphan"},
	}
	annotateBrokenWorktrees(entries)

	if entries[0].IsBroken {
		t.Fatal("main should not be broken")
	}
	if entries[1].IsBroken {
		t.Fatal("healthy worktree should not be broken")
	}
	if !entries[2].IsBroken {
		t.Fatal("empty worktree should be broken")
	}
	if !entries[3].IsBroken {
		t.Fatal("missing worktree should be broken")
	}
	if !entries[4].IsBroken {
		t.Fatal("gitdir-only worktree should be broken")
	}
}

func TestFindOrphanWorktreeEntries(t *testing.T) {
	parent := t.TempDir()
	repoRoot := filepath.Join(parent, "repo")
	if err := os.Mkdir(repoRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	orphan := filepath.Join(parent, "repo-wt-orphan")
	if err := os.Mkdir(orphan, 0o755); err != nil {
		t.Fatal(err)
	}
	gitdir := filepath.Join(repoRoot, ".git", "worktrees", "orphan")
	if err := os.WriteFile(filepath.Join(orphan, ".git"), []byte("gitdir: "+gitdir+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	unrelated := filepath.Join(parent, "other-empty")
	if err := os.Mkdir(unrelated, 0o755); err != nil {
		t.Fatal(err)
	}

	known := []WorktreeEntry{{Path: repoRoot, IsMain: true}}
	orphans := findOrphanWorktreeEntries(repoRoot, known)
	if len(orphans) != 1 {
		t.Fatalf("expected 1 orphan, got %#v", orphans)
	}
	if !pathsEqual(orphans[0].Path, orphan) {
		t.Fatalf("orphan path = %q, want %q", orphans[0].Path, orphan)
	}
	if !orphans[0].IsBroken {
		t.Fatal("orphan should be marked broken")
	}
}

func TestListWorktreesMetaMarksBrokenAndOrphans(t *testing.T) {
	parent := t.TempDir()
	repoRoot := filepath.Join(parent, "repo")
	if err := os.Mkdir(repoRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	emptyRegistered := filepath.Join(parent, "repo-wt-empty")
	if err := os.Mkdir(emptyRegistered, 0o755); err != nil {
		t.Fatal(err)
	}
	orphan := filepath.Join(parent, "repo-wt-orphan")
	if err := os.Mkdir(orphan, 0o755); err != nil {
		t.Fatal(err)
	}
	gitdir := filepath.Join(repoRoot, ".git", "worktrees", "orphan")
	if err := os.WriteFile(filepath.Join(orphan, ".git"), []byte("gitdir: "+gitdir+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	porcelain := worktreeListPorcelain(repoRoot, "main") +
		"\nworktree " + emptyRegistered + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	withFakeRunner(t, fake)

	entries, err := ListWorktreesMeta(repoRoot)
	if err != nil {
		t.Fatalf("ListWorktreesMeta: %v", err)
	}

	var sawEmpty, sawOrphan bool
	for _, entry := range entries {
		if pathsEqual(entry.Path, emptyRegistered) {
			sawEmpty = true
			if !entry.IsBroken {
				t.Fatal("empty registered worktree should be broken")
			}
		}
		if pathsEqual(entry.Path, orphan) {
			sawOrphan = true
			if !entry.IsBroken {
				t.Fatal("orphan should be broken")
			}
		}
	}
	if !sawEmpty {
		t.Fatal("missing empty registered worktree")
	}
	if !sawOrphan {
		t.Fatal("missing orphan worktree")
	}
}
