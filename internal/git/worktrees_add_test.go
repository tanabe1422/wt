package git

import (
	"os"
	"os/exec"
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

func initWorktreeAddRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	run("init")
	run("config", "user.email", "test@example.com")
	run("config", "user.name", "Test User")

	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "commit 1")

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}

	run("checkout", "-b", "feature")
	if err := os.WriteFile(filepath.Join(dir, "b.txt"), []byte("2\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "b.txt")
	run("commit", "-m", "feature commit")

	// Switch back so feature can be used for worktree add.
	run("checkout", defaultBranch)
	return dir
}

func TestAddWorktreeLocal(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-feature")

	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	if created != target {
		t.Fatalf("expected path %q, got %q", target, created)
	}

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	found := false
	for _, entry := range entries {
		if pathsEqual(entry.Path, created) && entry.Branch == "feature" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("created worktree not found in list: %+v", entries)
	}

	// cleanup so TempDir can remove parent
	if _, err := runGit(dir, "worktree", "remove", "--force", created); err != nil {
		t.Logf("cleanup worktree remove: %v", err)
	}
}

func TestAddWorktreeExistingPath(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-exists")
	if err := os.Mkdir(target, 0o755); err != nil {
		t.Fatal(err)
	}

	_, err := AddWorktree(dir, target, "feature", false)
	if err == nil {
		t.Fatal("expected error for existing directory")
	}
	if !strings.Contains(err.Error(), "既に存在") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAddWorktreeAlreadyCheckedOut(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target1 := filepath.Join(filepath.Dir(dir), "wt-feature-1")
	if _, err := AddWorktree(dir, target1, "feature", false); err != nil {
		t.Fatalf("first AddWorktree: %v", err)
	}
	defer func() {
		_, _ = runGit(dir, "worktree", "remove", "--force", target1)
	}()

	target2 := filepath.Join(filepath.Dir(dir), "wt-feature-2")
	_, err := AddWorktree(dir, target2, "feature", false)
	if err == nil {
		t.Fatal("expected error for already checked-out branch")
	}
	if !strings.Contains(err.Error(), "既にワークツリー") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAddWorktreeRemoteCreatesTrackingBranch(t *testing.T) {
	dir := initWorktreeAddRepo(t)

	// Simulate a remote ref without a local tracking branch.
	if err := os.MkdirAll(filepath.Join(dir, ".git", "refs", "remotes", "origin"), 0o755); err != nil {
		t.Fatal(err)
	}
	sha, err := runGit(dir, "rev-parse", "feature")
	if err != nil {
		t.Fatalf("rev-parse feature: %v", err)
	}
	refPath := filepath.Join(dir, ".git", "refs", "remotes", "origin", "remote-only")
	if err := os.WriteFile(refPath, []byte(sha+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Delete local feature so we use a different local name from remote.
	if _, err := runGit(dir, "branch", "-D", "feature"); err != nil {
		t.Fatalf("delete feature: %v", err)
	}

	target := filepath.Join(filepath.Dir(dir), "wt-remote-only")
	created, err := AddWorktree(dir, target, "origin/remote-only", true)
	if err != nil {
		t.Fatalf("AddWorktree remote: %v", err)
	}
	defer func() {
		_, _ = runGit(dir, "worktree", "remove", "--force", created)
	}()

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	found := false
	for _, entry := range entries {
		if pathsEqual(entry.Path, created) && entry.Branch == "remote-only" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("remote worktree not found: %+v", entries)
	}
}

func TestRemoveWorktree(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-remove")

	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}

	if err := RemoveWorktree(dir, created, false); err != nil {
		t.Fatalf("RemoveWorktree: %v", err)
	}

	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	for _, entry := range entries {
		if pathsEqual(entry.Path, created) {
			t.Fatalf("worktree still listed after remove: %+v", entry)
		}
	}
}

func TestRemoveWorktreeRejectsMain(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	entries, err := ListWorktrees(dir)
	if err != nil {
		t.Fatalf("ListWorktrees: %v", err)
	}
	var mainPath string
	for _, entry := range entries {
		if entry.IsMain {
			mainPath = entry.Path
			break
		}
	}
	if mainPath == "" {
		t.Fatal("main worktree not found")
	}

	err = RemoveWorktree(dir, mainPath, false)
	if err == nil {
		t.Fatal("expected error removing main worktree")
	}
	if !strings.Contains(err.Error(), "メイン") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRemoveWorktreeForceDirty(t *testing.T) {
	dir := initWorktreeAddRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-remove-dirty")

	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	if err := os.WriteFile(filepath.Join(created, "dirty.txt"), []byte("dirty\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := RemoveWorktree(dir, created, false); err == nil {
		t.Fatal("expected error removing dirty worktree without force")
	}

	if err := RemoveWorktree(dir, created, true); err != nil {
		t.Fatalf("RemoveWorktree force: %v", err)
	}
}
