package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func initSmokeRepo(t *testing.T) string {
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
	run("checkout", defaultBranch)
	return dir
}

func TestSmokeSwitchBranch(t *testing.T) {
	skipIfShort(t)
	dir := initSmokeRepo(t)

	if err := SwitchBranch(dir, "feature"); err != nil {
		t.Fatalf("SwitchBranch: %v", err)
	}
	current, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	if current != "feature" {
		t.Fatalf("expected feature, got %q", current)
	}
}

func TestSmokeAddWorktreeAndList(t *testing.T) {
	skipIfShort(t)
	dir := initSmokeRepo(t)
	target := filepath.Join(filepath.Dir(dir), "wt-smoke-"+filepath.Base(dir))

	created, err := AddWorktree(dir, target, "feature", false)
	if err != nil {
		t.Fatalf("AddWorktree: %v", err)
	}
	t.Cleanup(func() {
		_, _ = runGit(dir, "worktree", "remove", "--force", created)
	})

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
		t.Fatalf("created worktree not found: %+v", entries)
	}
}

func TestSmokeStageAndCommit(t *testing.T) {
	skipIfShort(t)
	dir := initSmokeRepo(t)

	if err := os.WriteFile(filepath.Join(dir, "c.txt"), []byte("3\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := StageFiles(dir, []string{"c.txt"}); err != nil {
		t.Fatalf("StageFiles: %v", err)
	}
	if err := Commit(dir, "smoke commit"); err != nil {
		t.Fatalf("Commit: %v", err)
	}
	status, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}
	if len(status) != 0 {
		t.Fatalf("expected clean status, got %+v", status)
	}
}
