package git

import (
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
