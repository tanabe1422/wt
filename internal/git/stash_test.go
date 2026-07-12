package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func initStashRepo(t *testing.T) string {
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

	if err := os.WriteFile(filepath.Join(dir, "base.txt"), []byte("base\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "base.txt")
	run("commit", "-m", "initial")
	return dir
}

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
	dir := initStashRepo(t)

	if err := os.WriteFile(filepath.Join(dir, "base.txt"), []byte("changed\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "untracked.txt"), []byte("new\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := SaveStash(dir, "wip changes", true); err != nil {
		t.Fatalf("SaveStash: %v", err)
	}

	entries, err := ListStashes(dir)
	if err != nil {
		t.Fatalf("ListStashes: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 stash, got %d", len(entries))
	}
	if entries[0].Index != 0 {
		t.Fatalf("unexpected index: %d", entries[0].Index)
	}
	if entries[0].Message == "" {
		t.Fatal("expected non-empty message")
	}

	// Working tree should be clean of the tracked change and untracked file.
	status, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus after save: %v", err)
	}
	if len(status) != 0 {
		t.Fatalf("expected clean status after stash, got %+v", status)
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

	// Drop the applied stash, then save again for pop.
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

	if err := os.WriteFile(filepath.Join(dir, "base.txt"), []byte("again\n"), 0o644); err != nil {
		t.Fatal(err)
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
