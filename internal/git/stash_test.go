package git

import (
	"errors"
	"strings"
	"testing"
)

func TestParseStashList(t *testing.T) {
	raw := "stash@{0}\x1fWIP on main: abc message\nstash@{1}\x1fon feature: older"
	entries := parseStashList(raw)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Index != 0 || entries[0].Ref != "stash@{0}" {
		t.Fatalf("unexpected first entry: %+v", entries[0])
	}
	if entries[0].Message != "WIP on main: abc message" {
		t.Fatalf("unexpected message: %q", entries[0].Message)
	}
	if entries[1].Index != 1 {
		t.Fatalf("unexpected second index: %d", entries[1].Index)
	}
}

func TestParseStashListEmpty(t *testing.T) {
	entries := parseStashList("")
	if len(entries) != 0 {
		t.Fatalf("expected empty, got %+v", entries)
	}
}

func TestStashSaveApplyPopDrop(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("stash", "push", "-u", "-m", "wip changes").Return("", nil)
	fake.On("stash", "list", "--format=%gd%x1f%s").Once().Return("stash@{0}\x1fwip changes", nil)
	fake.On("stash", "apply", "stash@{0}").Return("", nil)
	fake.On("stash", "list", "--format=%gd%x1f%s").Once().Return("stash@{0}\x1fwip changes", nil)
	fake.On("stash", "drop", "stash@{0}").Return("", nil)
	fake.On("stash", "list", "--format=%gd%x1f%s").Once().Return("", nil)
	fake.On("stash", "push", "-u", "-m", "for pop").Return("", nil)
	fake.On("stash", "pop", "stash@{0}").Return("", nil)
	fake.On("stash", "list", "--format=%gd%x1f%s").Once().Return("", nil)
	withFakeRunner(t, fake)

	if err := SaveStash(dir, "wip changes", true); err != nil {
		t.Fatalf("SaveStash: %v", err)
	}
	entries, err := ListStashes(dir)
	if err != nil {
		t.Fatalf("ListStashes: %v", err)
	}
	if len(entries) != 1 || entries[0].Index != 0 {
		t.Fatalf("unexpected entries: %+v", entries)
	}

	if err := ApplyStash(dir, 0); err != nil {
		t.Fatalf("ApplyStash: %v", err)
	}
	entries, err = ListStashes(dir)
	if err != nil {
		t.Fatalf("ListStashes after apply: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("apply should keep stash, got %d", len(entries))
	}

	if err := DropStash(dir, 0); err != nil {
		t.Fatalf("DropStash: %v", err)
	}
	entries, err = ListStashes(dir)
	if err != nil {
		t.Fatalf("ListStashes after drop: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected empty after drop, got %d", len(entries))
	}

	if err := SaveStash(dir, "for pop", true); err != nil {
		t.Fatalf("SaveStash for pop: %v", err)
	}
	if err := PopStash(dir, 0); err != nil {
		t.Fatalf("PopStash: %v", err)
	}
	entries, err = ListStashes(dir)
	if err != nil {
		t.Fatalf("ListStashes after pop: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected empty after pop, got %d", len(entries))
	}
}

func TestStashRefRejectsNegative(t *testing.T) {
	if _, err := stashRef(-1); err == nil {
		t.Fatal("expected error for negative index")
	}
}

func TestSaveStashWithoutMessage(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("stash", "push").Return("", nil)
	withFakeRunner(t, fake)

	if err := SaveStash(dir, "  ", false); err != nil {
		t.Fatalf("SaveStash: %v", err)
	}
	fake.AssertCalled(t, "stash", "push")
}

func TestApplyStashConflictMessage(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("stash", "apply", "stash@{0}").ReturnFull(
		"Auto-merging a.txt\nCONFLICT (content): Merge conflict in a.txt",
		"The stash entry is kept in case you need it again.",
		errors.New("exit status 1"),
	)
	withFakeRunner(t, fake)

	err := ApplyStash(dir, 0)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if !strings.Contains(err.Error(), "競合") {
		t.Fatalf("expected conflict message, got %q", err.Error())
	}
	if !strings.Contains(err.Error(), "一覧に残っています") {
		t.Fatalf("expected stash-kept note, got %q", err.Error())
	}
}

func TestPopStashConflictKeepsMessage(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("stash", "pop", "stash@{0}").ReturnFull(
		"CONFLICT (content): Merge conflict in b.txt",
		"",
		errors.New("exit status 1"),
	)
	withFakeRunner(t, fake)

	err := PopStash(dir, 0)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if !strings.Contains(err.Error(), "競合") {
		t.Fatalf("expected conflict message, got %q", err.Error())
	}
}

func TestIsStashConflictOutput(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"CONFLICT (content): Merge conflict in a.txt", true},
		{"Unmerged paths:\n  both modified: a.txt", true},
		{"error: could not apply abc123", true},
		{"fatal: stash@{9} is not a valid reference", false},
		{"", false},
	}
	for _, tc := range cases {
		if got := isStashConflictOutput(tc.in); got != tc.want {
			t.Fatalf("isStashConflictOutput(%q)=%v, want %v", tc.in, got, tc.want)
		}
	}
}

func TestListStashFilesAndDiff(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	nameStatus := "M\x00tracked.txt\x00A\x00untracked.txt\x00"
	fake.On(
		"stash", "show",
		"--include-untracked",
		"--name-status", "-z",
		"stash@{0}",
	).Return(nameStatus, nil)
	diffOut := "@@ -1,1 +1,2 @@\n context\n+added\n"
	fake.On(
		"stash", "show",
		"--include-untracked",
		"-U3",
		"stash@{0}",
		"--",
		"tracked.txt",
	).Return(diffOut, nil)
	withFakeRunner(t, fake)

	files, err := ListStashFiles(dir, 0)
	if err != nil {
		t.Fatalf("ListStashFiles: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %+v", files)
	}
	if files[0].Path != "tracked.txt" || files[0].Status != "M" {
		t.Fatalf("unexpected first file: %+v", files[0])
	}
	if files[1].Path != "untracked.txt" || files[1].Status != "A" {
		t.Fatalf("unexpected second file: %+v", files[1])
	}

	diff, err := GetStashFileDiff(dir, 0, "tracked.txt")
	if err != nil {
		t.Fatalf("GetStashFileDiff: %v", err)
	}
	if diff.Path != "tracked.txt" {
		t.Fatalf("unexpected path: %q", diff.Path)
	}
	if len(diff.Hunks) != 1 {
		t.Fatalf("expected 1 hunk, got %d", len(diff.Hunks))
	}
}

func TestListStashFilesEmptyArgs(t *testing.T) {
	if _, err := ListStashFiles("", 0); err == nil {
		t.Fatal("expected error for empty worktree")
	}
	if _, err := ListStashFiles(".", -1); err == nil {
		t.Fatal("expected error for negative index")
	}
}

func TestGetStashFileDiffEmptyArgs(t *testing.T) {
	if _, err := GetStashFileDiff("", 0, "a.txt"); err == nil {
		t.Fatal("expected error for empty worktree")
	}
	if _, err := GetStashFileDiff(".", -1, "a.txt"); err == nil {
		t.Fatal("expected error for negative index")
	}
	if _, err := GetStashFileDiff(".", 0, ""); err == nil {
		t.Fatal("expected error for empty file")
	}
	if _, err := GetStashFileDiff(".", 0, "  "); err == nil {
		t.Fatal("expected error for blank file")
	}
}
