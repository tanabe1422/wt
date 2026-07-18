package git

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeGitStateFile(t *testing.T, repoDir, name, content string) {
	t.Helper()
	gitDir, err := nativeGitDir(repoDir)
	if err != nil {
		t.Fatalf("nativeGitDir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(gitDir, name), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestIsRebasing(t *testing.T) {
	dir := initHotpathRepo(t)

	ok, err := IsRebasing(dir)
	if err != nil {
		t.Fatalf("IsRebasing: %v", err)
	}
	if ok {
		t.Fatal("expected false when REBASE_HEAD missing")
	}

	writeGitStateFile(t, dir, "REBASE_HEAD", "abc\n")
	ok, err = IsRebasing(dir)
	if err != nil {
		t.Fatalf("IsRebasing with file: %v", err)
	}
	if !ok {
		t.Fatal("expected true when REBASE_HEAD present")
	}
}

func TestGetRepoOperationStateRebase(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "REBASE_HEAD", "abc\n")

	state, err := GetRepoOperationState(dir)
	if err != nil {
		t.Fatalf("GetRepoOperationState: %v", err)
	}
	if state.Kind != RepoOperationRebase {
		t.Fatalf("expected rebase, got %q", state.Kind)
	}
}

func TestGetRepoOperationStateMerge(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "MERGE_HEAD", "abc\n")

	state, err := GetRepoOperationState(dir)
	if err != nil {
		t.Fatalf("GetRepoOperationState: %v", err)
	}
	if state.Kind != RepoOperationMerge {
		t.Fatalf("expected merge, got %q", state.Kind)
	}
}

func TestRebaseBranch(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("", nil)
	fake.On("rebase", "main").Return("", nil)
	withFakeRunner(t, fake)

	if err := RebaseBranch(dir, "main"); err != nil {
		t.Fatalf("RebaseBranch: %v", err)
	}
	fake.AssertCalled(t, "rebase", "main")
}

func TestRebaseBranchDirtyWorkingTree(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return(" M dirty.go", nil)
	fake.On("ls-files", "-s", "--", "dirty.go").Return("", nil)
	withFakeRunner(t, fake)

	err := RebaseBranch(dir, "main")
	if !errors.Is(err, ErrWorkingTreeDirty) {
		t.Fatalf("expected ErrWorkingTreeDirty, got %v", err)
	}
}

func TestContinueRebase(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rebase", "--continue").Return("", nil)
	withFakeRunner(t, fake)

	if err := ContinueRebase(dir); err != nil {
		t.Fatalf("ContinueRebase: %v", err)
	}
	fake.AssertCalled(t, "rebase", "--continue")
}

func TestAbortRebase(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rebase", "--abort").Return("", nil)
	withFakeRunner(t, fake)

	if err := AbortRebase(dir); err != nil {
		t.Fatalf("AbortRebase: %v", err)
	}
	fake.AssertCalled(t, "rebase", "--abort")
}

func TestPullRebaseArgs(t *testing.T) {
	args := pullRebaseArgs()
	if len(args) != 3 || args[0] != "pull" || args[1] != "--rebase" || args[2] != "--progress" {
		t.Fatalf("unexpected pull rebase args: %v", args)
	}
}

func TestPullRebase(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("pull", "--rebase", "--progress").Return("", nil)
	withFakeRunner(t, fake)

	if err := PullRebase(dir); err != nil {
		t.Fatalf("PullRebase: %v", err)
	}
	fake.AssertCalled(t, "pull", "--rebase", "--progress")
}

func TestAmendBlockReasonWhileRebasing(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "REBASE_HEAD", "def\n")

	if got := amendBlockReason(dir); got != "リベース中は修正できません" {
		t.Fatalf("unexpected reason: %q", got)
	}
}

func TestRebaseBranchEmptyUpstream(t *testing.T) {
	dir := t.TempDir()
	if err := RebaseBranch(dir, "  "); err == nil {
		t.Fatal("expected error for empty upstream")
	} else if !strings.Contains(err.Error(), "ブランチ名が空") {
		t.Fatalf("unexpected error: %v", err)
	}
}
