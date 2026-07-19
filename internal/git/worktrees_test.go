package git

import (
	"testing"
)

func TestListWorktrees(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	porcelain := "worktree " + dir + "\nHEAD abc\nbranch refs/heads/main\n"
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	fake.On("status", "--porcelain=v1", "-u").Return("", nil)
	withFakeRunner(t, fake)

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 worktree, got %+v", entries)
	}
	if !entries[0].IsMain || entries[0].Branch != "main" {
		t.Fatalf("unexpected entry: %+v", entries[0])
	}
}

func TestListWorktreesChangedFileCount(t *testing.T) {
	dir := t.TempDir()
	other := dir + "-other"
	porcelain := "worktree " + dir + "\nHEAD abc\nbranch refs/heads/main\n\n" +
		"worktree " + other + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	fake.On("status", "--porcelain=v1", "-u").Return("?? dirty-count.txt", nil)
	withFakeRunner(t, fake)

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	found := false
	for _, entry := range entries {
		if entry.Branch != "feature" {
			continue
		}
		found = true
		if entry.ChangedFileCount != 1 {
			t.Fatalf("expected ChangedFileCount=1, got %d", entry.ChangedFileCount)
		}
	}
	if !found {
		t.Fatalf("feature worktree not found: %+v", entries)
	}
}

func TestListWorktreesMetaSkipsStatus(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(worktreeListPorcelain(dir, "main"), nil)
	withFakeRunner(t, fake)

	meta, err := ListWorktreesMeta(dir)
	if err != nil {
		t.Fatalf("ListWorktreesMeta: %v", err)
	}
	if len(meta) == 0 {
		t.Fatal("expected at least one worktree")
	}
	for _, entry := range meta {
		if entry.ChangedFileCount != 0 {
			t.Fatalf("meta list should leave ChangedFileCount at 0, got %+v", entry)
		}
	}
	fake.AssertNotCalledPrefix(t, "status")
}

func TestGetWorktreeChangedCount(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Once().Return(" M a.txt\n?? b.txt", nil)
	withFakeRunner(t, fake)

	n, err := GetWorktreeChangedCount(dir)
	if err != nil {
		t.Fatalf("GetWorktreeChangedCount: %v", err)
	}
	if n != 2 {
		t.Fatalf("expected 2, got %d", n)
	}
}

func TestGetWorktreeChangedCounts(t *testing.T) {
	dirA := t.TempDir()
	dirB := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return(" M a.txt", nil)
	withFakeRunner(t, fake)

	got := GetWorktreeChangedCounts([]string{dirA, dirB})
	if len(got) != 2 {
		t.Fatalf("len=%d want 2", len(got))
	}
	if got[0].Path != dirA || got[0].Count != 1 || !got[0].OK {
		t.Fatalf("got[0]=%+v", got[0])
	}
	if got[1].Path != dirB || got[1].Count != 1 || !got[1].OK {
		t.Fatalf("got[1]=%+v", got[1])
	}
}

func TestCountChangedFiles(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Once().Return("", nil)
	fake.On("status", "--porcelain=v1", "-u").Once().Return("?? count-changed.txt", nil)
	withFakeRunner(t, fake)

	n, err := countChangedFiles(dir)
	if err != nil {
		t.Fatalf("countChangedFiles clean: %v", err)
	}
	if n != 0 {
		t.Fatalf("expected 0 on clean tree, got %d", n)
	}

	n, err = countChangedFiles(dir)
	if err != nil {
		t.Fatalf("countChangedFiles dirty: %v", err)
	}
	if n != 1 {
		t.Fatalf("expected 1 changed file, got %d", n)
	}
}
