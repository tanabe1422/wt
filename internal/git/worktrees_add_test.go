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

func TestRemoveWorktreeRecoversEmptyRemnant(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(dir, "wt-empty-remnant")
	if err := os.Mkdir(created, 0o755); err != nil {
		t.Fatal(err)
	}
	// Nested empty dirs should still count as an empty remnant.
	if err := os.Mkdir(filepath.Join(created, "nested"), 0o755); err != nil {
		t.Fatal(err)
	}

	listed := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	pruned := worktreeListPorcelain(dir, "main")
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Once().Return(listed, nil)
	fake.On("worktree", "remove", created).Return("", errors.New("fatal: 'wt-empty-remnant' is locked"))
	fake.On("worktree", "prune").Return("", nil)
	fake.On("worktree", "list", "--porcelain").Return(pruned, nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(dir, created, false); err != nil {
		t.Fatalf("RemoveWorktree recover: %v", err)
	}
	if _, err := os.Stat(created); !os.IsNotExist(err) {
		t.Fatalf("expected remnant removed, stat err=%v", err)
	}
	fake.AssertCalled(t, "worktree", "prune")
}

func TestRemoveWorktreeRecoversMissingPathWithStaleRegistration(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(dir, "wt-already-gone")

	listed := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	pruned := worktreeListPorcelain(dir, "main")
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Once().Return(listed, nil)
	fake.On("worktree", "remove", created).Return("", errors.New("fatal: '"+created+"' not found"))
	fake.On("worktree", "prune").Return("", nil)
	fake.On("worktree", "list", "--porcelain").Return(pruned, nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(dir, created, false); err != nil {
		t.Fatalf("RemoveWorktree recover missing: %v", err)
	}
	fake.AssertCalled(t, "worktree", "prune")
}

func TestRemoveWorktreeDoesNotDeleteNonEmptyRemnant(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(dir, "wt-dirty-remnant")
	if err := os.Mkdir(created, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(created, "keep.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	listed := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(listed, nil)
	fake.On("worktree", "remove", created).Return("", errors.New("fatal: contains modified or untracked files"))
	withFakeRunner(t, fake)

	err := RemoveWorktree(dir, created, false)
	if err == nil {
		t.Fatal("expected error for non-empty remnant")
	}
	if !strings.Contains(err.Error(), "強制削除") {
		t.Fatalf("expected force guidance, got: %v", err)
	}
	if _, statErr := os.Stat(filepath.Join(created, "keep.txt")); statErr != nil {
		t.Fatalf("expected file kept: %v", statErr)
	}
	fake.AssertNotCalledPrefix(t, "worktree", "prune")
}

func TestRemoveWorktreeForceDeletesNonEmptyRemnant(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(dir, "wt-force-remnant")
	if err := os.Mkdir(created, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(created, "keep.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	listed := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	pruned := worktreeListPorcelain(dir, "main")
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Once().Return(listed, nil)
	fake.On("worktree", "remove", "--force", created).Return("", errors.New("fatal: cannot remove"))
	fake.On("worktree", "prune").Return("", nil)
	fake.On("worktree", "list", "--porcelain").Return(pruned, nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(dir, created, true); err != nil {
		t.Fatalf("RemoveWorktree force remnant: %v", err)
	}
	if _, err := os.Stat(created); !os.IsNotExist(err) {
		t.Fatalf("expected remnant removed, stat err=%v", err)
	}
}

func TestRemoveWorktreeInUseGuidance(t *testing.T) {
	dir := t.TempDir()
	created := filepath.Join(dir, "wt-in-use")
	if err := os.Mkdir(created, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(created, "open.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	listed := worktreeListPorcelain(dir, "main") + "\nworktree " + created + "\nHEAD def\nbranch refs/heads/feature\n"
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(listed, nil)
	fake.On("worktree", "remove", created).Return(
		"",
		errors.New("unlinkat: The process cannot access the file because it is being used by another process."),
	)
	withFakeRunner(t, fake)

	err := RemoveWorktree(dir, created, false)
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "強制削除") {
		t.Fatalf("expected force guidance, got: %v", err)
	}
}

func TestWrapWorktreeRemoveErrorEmptyRemnant(t *testing.T) {
	err := wrapWorktreeRemoveError(errors.New("remove failed"), `C:\wt\feature`, true)
	if !strings.Contains(err.Error(), "中身は削除済み") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRemoveWorktreeRecoversGitdirOnlyOrphanWithoutForce(t *testing.T) {
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

	// Not registered with git; ListWorktreesMeta will still surface it as an orphan.
	porcelain := worktreeListPorcelain(repoRoot, "main")
	fake := newFakeRunner()
	fake.On("worktree", "list", "--porcelain").Return(porcelain, nil)
	fake.On("worktree", "remove", orphan).Return("", errors.New("fatal: '"+orphan+"' is not a working tree"))
	fake.On("worktree", "prune").Return("", nil)
	withFakeRunner(t, fake)

	if err := RemoveWorktree(repoRoot, orphan, false); err != nil {
		t.Fatalf("RemoveWorktree orphan gitdir-only: %v", err)
	}
	if _, err := os.Stat(orphan); !os.IsNotExist(err) {
		t.Fatalf("expected orphan removed, stat err=%v", err)
	}
	fake.AssertCalled(t, "worktree", "prune")
}
