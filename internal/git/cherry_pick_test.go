package git

import (
	"strings"
	"testing"
)

func TestIsCherryPicking(t *testing.T) {
	dir := initHotpathRepo(t)

	ok, err := IsCherryPicking(dir)
	if err != nil {
		t.Fatalf("IsCherryPicking: %v", err)
	}
	if ok {
		t.Fatal("expected false when CHERRY_PICK_HEAD missing")
	}

	writeGitStateFile(t, dir, "CHERRY_PICK_HEAD", "abc\n")
	ok, err = IsCherryPicking(dir)
	if err != nil {
		t.Fatalf("IsCherryPicking with file: %v", err)
	}
	if !ok {
		t.Fatal("expected true when CHERRY_PICK_HEAD present")
	}
}

func TestGetRepoOperationStateCherryPick(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "CHERRY_PICK_HEAD", "abc\n")

	state, err := GetRepoOperationState(dir)
	if err != nil {
		t.Fatalf("GetRepoOperationState: %v", err)
	}
	if state.Kind != RepoOperationCherryPick {
		t.Fatalf("expected cherry-pick, got %q", state.Kind)
	}
}

func TestGetRepoOperationStateRebaseWinsOverCherryPick(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "REBASE_HEAD", "abc\n")
	writeGitStateFile(t, dir, "CHERRY_PICK_HEAD", "def\n")

	state, err := GetRepoOperationState(dir)
	if err != nil {
		t.Fatalf("GetRepoOperationState: %v", err)
	}
	if state.Kind != RepoOperationRebase {
		t.Fatalf("expected rebase, got %q", state.Kind)
	}
}

func TestCherryPick(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("", nil)
	fake.On("cherry-pick", "abc123").Return("", nil)
	withFakeRunner(t, fake)

	if err := CherryPick(dir, "abc123"); err != nil {
		t.Fatalf("CherryPick: %v", err)
	}
	fake.AssertCalled(t, "cherry-pick", "abc123")
}

func TestCherryPickDirtyWorkingTree(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return(" M dirty.go", nil)
	fake.On("ls-files", "-s", "--", "dirty.go").Return("", nil)
	withFakeRunner(t, fake)

	err := CherryPick(dir, "abc123")
	if err == nil || !strings.Contains(err.Error(), "未コミットの変更") {
		t.Fatalf("expected dirty-tree error, got %v", err)
	}
}

func TestCherryPickEmptySHA(t *testing.T) {
	dir := t.TempDir()
	if err := CherryPick(dir, "  "); err == nil {
		t.Fatal("expected error for empty sha")
	} else if !strings.Contains(err.Error(), "コミットが空") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestContinueCherryPick(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("cherry-pick", "--continue").Return("", nil)
	withFakeRunner(t, fake)

	if err := ContinueCherryPick(dir); err != nil {
		t.Fatalf("ContinueCherryPick: %v", err)
	}
	fake.AssertCalled(t, "cherry-pick", "--continue")
}

func TestAbortCherryPick(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("cherry-pick", "--abort").Return("", nil)
	withFakeRunner(t, fake)

	if err := AbortCherryPick(dir); err != nil {
		t.Fatalf("AbortCherryPick: %v", err)
	}
	fake.AssertCalled(t, "cherry-pick", "--abort")
}

func TestSkipCherryPick(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("cherry-pick", "--skip").Return("", nil)
	withFakeRunner(t, fake)

	if err := SkipCherryPick(dir); err != nil {
		t.Fatalf("SkipCherryPick: %v", err)
	}
	fake.AssertCalled(t, "cherry-pick", "--skip")
}

func TestAmendBlockReasonWhileCherryPicking(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "CHERRY_PICK_HEAD", "def\n")

	if got := amendBlockReason(dir); got != "cherry-pick 中は修正できません" {
		t.Fatalf("unexpected reason: %q", got)
	}
}
