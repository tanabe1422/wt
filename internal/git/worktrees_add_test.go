package git

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDefaultWorktreePathAvailable(t *testing.T) {
	repoRoot := t.TempDir()
	got, err := DefaultWorktreePath(repoRoot, "feature/foo")
	if err != nil {
		t.Fatalf("DefaultWorktreePath: %v", err)
	}
	want := filepath.Join(filepath.Dir(repoRoot), "feature", "foo")
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestDefaultWorktreePathCollisionSuffix(t *testing.T) {
	parent := t.TempDir()
	repoRoot := filepath.Join(parent, "repo")
	if err := os.Mkdir(repoRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(parent, "feature")
	if err := os.Mkdir(existing, 0o755); err != nil {
		t.Fatal(err)
	}

	got, err := DefaultWorktreePath(repoRoot, "feature")
	if err != nil {
		t.Fatalf("DefaultWorktreePath: %v", err)
	}
	want := filepath.Join(parent, "feature-2")
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestDefaultWorktreePathNestedCollision(t *testing.T) {
	parent := t.TempDir()
	repoRoot := filepath.Join(parent, "repo")
	if err := os.Mkdir(repoRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(parent, "feature", "foo")
	if err := os.MkdirAll(existing, 0o755); err != nil {
		t.Fatal(err)
	}

	got, err := DefaultWorktreePath(repoRoot, "feature/foo")
	if err != nil {
		t.Fatalf("DefaultWorktreePath: %v", err)
	}
	want := filepath.Join(parent, "feature", "foo-2")
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestDefaultWorktreePathEmptyBranch(t *testing.T) {
	if _, err := DefaultWorktreePath(t.TempDir(), "  "); err == nil {
		t.Fatal("expected error for empty branch name")
	}
}

func TestResolveWorktreeTargetPath(t *testing.T) {
	repoRoot := t.TempDir()

	rel, err := resolveWorktreeTargetPath(repoRoot, "../sibling")
	if err != nil {
		t.Fatalf("resolveWorktreeTargetPath relative: %v", err)
	}
	wantRel, err := filepath.Abs(filepath.Join(repoRoot, "../sibling"))
	if err != nil {
		t.Fatal(err)
	}
	if rel != wantRel {
		t.Fatalf("relative: expected %q, got %q", wantRel, rel)
	}

	absInput := filepath.Join(filepath.Dir(repoRoot), "absolute-wt")
	abs, err := resolveWorktreeTargetPath(repoRoot, absInput)
	if err != nil {
		t.Fatalf("resolveWorktreeTargetPath absolute: %v", err)
	}
	wantAbs, err := filepath.Abs(absInput)
	if err != nil {
		t.Fatal(err)
	}
	if abs != wantAbs {
		t.Fatalf("absolute: expected %q, got %q", wantAbs, abs)
	}
}

func worktreeListPorcelain(mainPath, branch string) string {
	return "worktree " + mainPath + "\nHEAD abc\nbranch refs/heads/" + branch + "\n"
}

func TestAddWorktreeLocal(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(filepath.Dir(dir), "wt-feature-"+filepath.Base(dir))
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(worktreeListPorcelain(dir, "main"), nil)
	fake.On("worktree", "add", target, "feature").Return("", nil)
	withFakeRunner(t, fake)

	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	if created != target {
		t.Fatalf("expected path %q, got %q", target, created)
	}
	fake.AssertCalled(t, "worktree", "add", target, "feature")
}

func TestAddWorktreeExistingPath(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "exists")
	if err := os.Mkdir(target, 0o755); err != nil {
		t.Fatal(err)
	}
	fake := newFakeRunner()
	withFakeRunner(t, fake)

	_, err := AddWorktree(dir, target, "feature", false)
	if err == nil {
		t.Fatal("expected error for existing directory")
	}
	if !strings.Contains(err.Error(), "既に存在") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAddWorktreeAlreadyCheckedOut(t *testing.T) {
	dir := t.TempDir()
	other := filepath.Join(filepath.Dir(dir), "other-"+filepath.Base(dir))
	target := filepath.Join(filepath.Dir(dir), "wt-feature-2-"+filepath.Base(dir))
	porcelain := worktreeListPorcelain(dir, "main") + "\nworktree " + other + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	withFakeRunner(t, fake)

	_, err := AddWorktree(dir, target, "feature", false)
	if err == nil {
		t.Fatal("expected error for already checked-out branch")
	}
	if !strings.Contains(err.Error(), "既にワークツリー") {
		t.Fatalf("unexpected error: %v", err)
	}
	fake.AssertNotCalledPrefix(t, "worktree", "add")
}

func TestAddWorktreeRemoteCreatesTrackingBranch(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(filepath.Dir(dir), "wt-remote-"+filepath.Base(dir))
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(worktreeListPorcelain(dir, "main"), nil)
	fake.On("rev-parse", "--verify", "refs/heads/remote-only").Return("", errors.New("missing"))
	fake.On("worktree", "add", "-b", "remote-only", target, "origin/remote-only").Return("", nil)
	withFakeRunner(t, fake)

	created, err := AddWorktree(dir, target, "origin/remote-only", true)
	if err != nil {
		t.Fatalf("AddWorktree remote: %v", err)
	}
	if created != target {
		t.Fatalf("expected %q, got %q", target, created)
	}
	fake.AssertCalled(t, "worktree", "add", "-b", "remote-only", target, "origin/remote-only")
}

func TestAddWorktreeRemoteExistingLocal(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(filepath.Dir(dir), "wt-remote-exist-"+filepath.Base(dir))
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(worktreeListPorcelain(dir, "main"), nil)
	fake.On("rev-parse", "--verify", "refs/heads/feature").Return("abc", nil)
	fake.On("worktree", "add", target, "feature").Return("", nil)
	withFakeRunner(t, fake)

	if _, err := AddWorktree(dir, target, "origin/feature", true); err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	fake.AssertCalled(t, "worktree", "add", target, "feature")
}

func TestRemoveWorktree(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(filepath.Dir(dir), "wt-remove-"+filepath.Base(dir))
	porcelain := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	fake.On("worktree", "remove", created).Return("", nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(dir, created, false); err != nil {
		t.Fatalf("RemoveWorktree: %v", err)
	}
	fake.AssertCalled(t, "worktree", "remove", created)
}

func TestRemoveWorktreeRejectsMain(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(worktreeListPorcelain(dir, "main"), nil)
	withFakeRunner(t, fake)

	err := RemoveWorktree(dir, dir, false)
	if err == nil {
		t.Fatal("expected error removing main worktree")
	}
	if !strings.Contains(err.Error(), "メイン") {
		t.Fatalf("unexpected error: %v", err)
	}
	fake.AssertNotCalledPrefix(t, "worktree", "remove")
}

func TestRemoveWorktreeForce(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(filepath.Dir(dir), "wt-force-"+filepath.Base(dir))
	porcelain := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	fake.On("worktree", "remove", "--force", created).Return("", nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(dir, created, true); err != nil {
		t.Fatalf("RemoveWorktree force: %v", err)
	}
	fake.AssertCalled(t, "worktree", "remove", "--force", created)
}
