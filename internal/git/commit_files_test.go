package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseNameStatusZ(t *testing.T) {
	raw := "M\x00README.md\x00A\x00src/new.go\x00R100\x00old.txt\x00new.txt\x00"
	changes := parseNameStatusZ(raw)
	if len(changes) != 3 {
		t.Fatalf("expected 3 changes, got %d: %+v", len(changes), changes)
	}
	if changes[0].Status != "M" || changes[0].Path != "README.md" {
		t.Fatalf("unexpected first change: %+v", changes[0])
	}
	if changes[1].Status != "A" || changes[1].Path != "src/new.go" {
		t.Fatalf("unexpected second change: %+v", changes[1])
	}
	if changes[2].Status != "R" || changes[2].Path != "new.txt" || changes[2].OldPath != "old.txt" {
		t.Fatalf("unexpected rename change: %+v", changes[2])
	}
}

func TestParseNameStatusZEmpty(t *testing.T) {
	changes := parseNameStatusZ("")
	if len(changes) != 0 {
		t.Fatalf("expected empty, got %+v", changes)
	}
}

func TestListCommitFilesAndDiff(t *testing.T) {
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

	write := func(name, content string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	write("a.txt", "line1\n")
	run("add", "a.txt")
	run("commit", "-m", "root commit")

	rootSHA, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatalf("rev-parse root: %v", err)
	}
	rootSHA = strings.TrimSpace(rootSHA)

	rootFiles, err := ListCommitFiles(dir, rootSHA)
	if err != nil {
		t.Fatalf("ListCommitFiles root: %v", err)
	}
	if len(rootFiles) != 1 || rootFiles[0].Path != "a.txt" || rootFiles[0].Status != "A" {
		t.Fatalf("unexpected root files: %+v", rootFiles)
	}

	write("a.txt", "line1\nline2\n")
	write("b.txt", "new\n")
	run("add", "a.txt", "b.txt")
	run("commit", "-m", "second commit")

	secondSHA, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatalf("rev-parse second: %v", err)
	}
	secondSHA = strings.TrimSpace(secondSHA)

	files, err := ListCommitFiles(dir, secondSHA)
	if err != nil {
		t.Fatalf("ListCommitFiles second: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %+v", files)
	}

	byPath := map[string]CommitFileChange{}
	for _, f := range files {
		byPath[f.Path] = f
	}
	if byPath["a.txt"].Status != "M" {
		t.Fatalf("expected a.txt modified, got %+v", byPath["a.txt"])
	}
	if byPath["b.txt"].Status != "A" {
		t.Fatalf("expected b.txt added, got %+v", byPath["b.txt"])
	}

	diff, err := GetCommitFileDiff(dir, secondSHA, "a.txt")
	if err != nil {
		t.Fatalf("GetCommitFileDiff: %v", err)
	}
	if diff.Path != "a.txt" {
		t.Fatalf("unexpected path: %s", diff.Path)
	}
	if len(diff.Hunks) == 0 {
		t.Fatal("expected hunks in commit file diff")
	}

	foundAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && line.Content == "line2" {
				foundAdd = true
			}
		}
	}
	if !foundAdd {
		t.Fatalf("expected added line2 in diff: %+v", diff)
	}
}

func TestGetCommitFileDiffEmptyArgs(t *testing.T) {
	_, err := GetCommitFileDiff(".", "", "a.txt")
	if err == nil {
		t.Fatal("expected error for empty sha")
	}
	_, err = GetCommitFileDiff(".", "abc", "")
	if err == nil {
		t.Fatal("expected error for empty file")
	}
}
