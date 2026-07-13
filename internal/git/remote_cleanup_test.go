package git

import (
	"errors"
	"testing"
)

func TestDefaultRemoteBaseRefFromOriginHEAD(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "refs/remotes/origin/HEAD").Return("origin/main", nil)
	withFakeRunner(t, fake)

	got, err := DefaultRemoteBaseRef("/repo")
	if err != nil {
		t.Fatalf("DefaultRemoteBaseRef: %v", err)
	}
	if got != "origin/main" {
		t.Fatalf("got %q want origin/main", got)
	}
}

func TestDefaultRemoteBaseRefFallbackMain(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "refs/remotes/origin/HEAD").Return("", errors.New("missing"))
	fake.On("for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)", "refs/remotes/").Return(
		"origin/feature|2026-01-01T00:00:00+09:00\norigin/main|2026-07-01T00:00:00+09:00\norigin/HEAD|2026-07-01T00:00:00+09:00", nil,
	)
	withFakeRunner(t, fake)

	got, err := DefaultRemoteBaseRef("/repo")
	if err != nil {
		t.Fatalf("DefaultRemoteBaseRef: %v", err)
	}
	if got != "origin/main" {
		t.Fatalf("got %q want origin/main", got)
	}
}

func TestListRemoteMergeStatusAncestry(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "origin/main").Return("abc", nil)
	fake.On("for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)", "refs/remotes/").Return(
		"origin/done|2026-06-01T12:00:00+09:00\norigin/main|2026-07-01T12:00:00+09:00\norigin/wip|2026-07-10T12:00:00+09:00\norigin/HEAD|2026-07-01T12:00:00+09:00", nil,
	)
	fake.On("for-each-ref", "--format=%(refname:short)", "--merged=origin/main", "refs/remotes/").Return(
		"origin/done\norigin/main", nil,
	)
	withFakeRunner(t, fake)

	entries, err := ListRemoteMergeStatus("/repo", "origin/main", "ancestry")
	if err != nil {
		t.Fatalf("ListRemoteMergeStatus: %v", err)
	}
	want := map[string]struct {
		merged bool
		date   string
	}{
		"origin/done": {true, "2026-06-01T12:00:00+09:00"},
		"origin/wip":  {false, "2026-07-10T12:00:00+09:00"},
	}
	if len(entries) != 2 {
		t.Fatalf("entries=%v want 2", entries)
	}
	// Newest tip first.
	if entries[0].Name != "origin/wip" || entries[1].Name != "origin/done" {
		t.Fatalf("order=%v,%v want wip then done", entries[0].Name, entries[1].Name)
	}
	for _, e := range entries {
		w, ok := want[e.Name]
		if !ok {
			t.Fatalf("unexpected entry %v", e)
		}
		if e.Merged != w.merged || e.LastCommitAt != w.date {
			t.Fatalf("%s got merged=%v date=%q want merged=%v date=%q", e.Name, e.Merged, e.LastCommitAt, w.merged, w.date)
		}
	}
}

func TestListRemoteMergeStatusContent(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "origin/main").Return("abc", nil)
	fake.On("for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)", "refs/remotes/").Return(
		"origin/squashed|2026-05-01T00:00:00+09:00\norigin/main|2026-07-01T00:00:00+09:00\norigin/active|2026-07-05T00:00:00+09:00", nil,
	)
	fake.On("rev-parse", "origin/main^{tree}").Return("tree-main", nil)
	fake.On("merge-tree", "--write-tree", "origin/main", "origin/active").Return("tree-other", nil)
	fake.On("merge-tree", "--write-tree", "origin/main", "origin/squashed").Return("tree-main", nil)
	withFakeRunner(t, fake)

	entries, err := ListRemoteMergeStatus("/repo", "origin/main", "content")
	if err != nil {
		t.Fatalf("ListRemoteMergeStatus: %v", err)
	}
	want := map[string]bool{"origin/squashed": true, "origin/active": false}
	if len(entries) != 2 {
		t.Fatalf("entries=%v want 2", entries)
	}
	for _, e := range entries {
		if e.Merged != want[e.Name] {
			t.Fatalf("%s merged=%v want %v", e.Name, e.Merged, want[e.Name])
		}
		if e.LastCommitAt == "" {
			t.Fatalf("%s missing LastCommitAt", e.Name)
		}
	}
}

func TestListRemoteMergeStatusContentConflictIsUnmerged(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "origin/main").Return("abc", nil)
	fake.On("for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)", "refs/remotes/").Return(
		"origin/conflict|2026-04-01T00:00:00+09:00\norigin/main|2026-07-01T00:00:00+09:00", nil,
	)
	fake.On("rev-parse", "origin/main^{tree}").Return("tree-main", nil)
	fake.On("merge-tree", "--write-tree", "origin/main", "origin/conflict").Return("", errors.New("conflict"))
	withFakeRunner(t, fake)

	entries, err := ListRemoteMergeStatus("/repo", "origin/main", "content")
	if err != nil {
		t.Fatalf("ListRemoteMergeStatus: %v", err)
	}
	if len(entries) != 1 || entries[0].Name != "origin/conflict" || entries[0].Merged {
		t.Fatalf("entries=%v", entries)
	}
}

func TestListRemoteMergeStatusEmptyBase(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if _, err := ListRemoteMergeStatus("/repo", "  ", "ancestry"); err == nil {
		t.Fatal("expected error")
	}
}

func TestListRemoteMergeStatusInvalidMode(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "origin/main").Return("abc", nil)
	withFakeRunner(t, fake)
	if _, err := ListRemoteMergeStatus("/repo", "origin/main", "weird"); err == nil {
		t.Fatal("expected error")
	}
}

func TestDeleteRemoteBranches(t *testing.T) {
	fake := newFakeRunner()
	fake.On("push", "origin", "--delete", "feature/a", "feature/b").Return("", nil)
	withFakeRunner(t, fake)

	if err := DeleteRemoteBranches("/repo", []string{"origin/feature/a", "origin/feature/b"}); err != nil {
		t.Fatalf("DeleteRemoteBranches: %v", err)
	}
	fake.AssertCalled(t, "push", "origin", "--delete", "feature/a", "feature/b")
}

func TestDeleteRemoteBranchesGroupsByRemote(t *testing.T) {
	fake := newFakeRunner()
	fake.On("push", "origin", "--delete", "a").Return("", nil)
	fake.On("push", "upstream", "--delete", "b").Return("", nil)
	withFakeRunner(t, fake)

	if err := DeleteRemoteBranches("/repo", []string{"origin/a", "upstream/b"}); err != nil {
		t.Fatalf("DeleteRemoteBranches: %v", err)
	}
	fake.AssertCalled(t, "push", "origin", "--delete", "a")
	fake.AssertCalled(t, "push", "upstream", "--delete", "b")
}

func TestDeleteRemoteBranchesRejectsHEAD(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := DeleteRemoteBranches("/repo", []string{"origin/HEAD"}); err == nil {
		t.Fatal("expected error")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestDeleteRemoteBranchesEmpty(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := DeleteRemoteBranches("/repo", nil); err == nil {
		t.Fatal("expected error")
	}
}
