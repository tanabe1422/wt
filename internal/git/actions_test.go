package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func sampleRepoPath(t *testing.T) string {
	t.Helper()
	repoPath := filepath.Join("..", "..", "sample-repo")
	if _, err := os.Stat(repoPath); err != nil {
		t.Skip("sample-repo not found")
	}
	return repoPath
}

func gitHead(t *testing.T, dir string) string {
	t.Helper()
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("rev-parse HEAD: %v", err)
	}
	return strings.TrimSpace(string(out))
}

func TestGetStatusIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	testFile := filepath.Join(repo, "status-test-tmp.txt")
	if err := os.WriteFile(testFile, []byte("hello\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(testFile) })

	entries, err := GetStatus(repo)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}

	var found *FileStatus
	for i := range entries {
		if entries[i].Path == "status-test-tmp.txt" {
			found = &entries[i]
			break
		}
	}
	if found == nil {
		t.Fatal("expected untracked file in status")
	}
	if !HasUnstagedChange(*found) || HasStagedChange(*found) {
		t.Fatalf("unexpected status: %+v", found)
	}
}

func TestStageCommitIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	testName := fmt.Sprintf("commit-test-%d.txt", time.Now().UnixNano())
	testFile := filepath.Join(repo, testName)
	content := fmt.Sprintf("commit me %d\n", time.Now().UnixNano())
	if err := os.WriteFile(testFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	before := gitHead(t, repo)
	t.Cleanup(func() {
		cmd := exec.Command("git", "reset", "--hard", before)
		cmd.Dir = repo
		_ = cmd.Run()
		_ = os.Remove(testFile)
	})

	if err := StageFiles(repo, []string{testName}); err != nil {
		t.Fatalf("StageFiles: %v", err)
	}

	entries, err := GetStatus(repo)
	if err != nil {
		t.Fatalf("GetStatus after stage: %v", err)
	}
	var found bool
	for _, entry := range entries {
		if filepath.Base(filepath.FromSlash(entry.Path)) == testName && HasStagedChange(entry) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected staged file %q, got: %+v", testName, entries)
	}

	if err := Commit(repo, "test: commit integration"); err != nil {
		t.Fatalf("Commit: %v", err)
	}

	after := gitHead(t, repo)
	if before == after {
		t.Fatal("HEAD should advance after commit")
	}
}

func TestGetFileDiffUntrackedIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	testName := fmt.Sprintf("untracked-diff-%d.txt", time.Now().UnixNano())
	testFile := filepath.Join(repo, testName)
	content := fmt.Sprintf("line one %d\nline two\n", time.Now().UnixNano())
	if err := os.WriteFile(testFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(testFile) })

	diff, err := GetFileDiff(repo, testName, false)
	if err != nil {
		t.Fatalf("GetFileDiff: %v", err)
	}
	if len(diff.Hunks) == 0 {
		t.Fatal("expected at least one hunk for untracked file")
	}

	hasAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && strings.Contains(line.Content, "line one") {
				hasAdd = true
			}
		}
	}
	if !hasAdd {
		t.Fatal("expected added lines for untracked file")
	}
}

func TestGetFileDiffIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	readme := filepath.Join(repo, "README.md")
	original, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.WriteFile(readme, original, 0o644) })

	modified := string(original) + "\n# diff test line\n"
	if err := os.WriteFile(readme, []byte(modified), 0o644); err != nil {
		t.Fatal(err)
	}

	diff, err := GetFileDiff(repo, "README.md", false)
	if err != nil {
		t.Fatalf("GetFileDiff: %v", err)
	}
	if len(diff.Hunks) == 0 {
		t.Fatal("expected at least one hunk")
	}

	hasAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && strings.Contains(line.Content, "diff test line") {
				hasAdd = true
			}
		}
	}
	if !hasAdd {
		t.Fatal("expected added line in diff")
	}
}

func TestFetchArgs(t *testing.T) {
	args := fetchArgs()
	if len(args) != 1 || args[0] != "fetch" {
		t.Fatalf("fetchArgs()=%v want [fetch]", args)
	}
}

func TestPullArgs(t *testing.T) {
	args := pullArgs()
	if len(args) != 1 || args[0] != "pull" {
		t.Fatalf("pullArgs()=%v want [pull]", args)
	}
}

func TestPushArgs(t *testing.T) {
	args := pushArgs()
	if len(args) != 1 || args[0] != "push" {
		t.Fatalf("pushArgs()=%v want [push]", args)
	}
}

func TestOpenMergetoolArgs(t *testing.T) {
	args := openMergetoolArgs("src/conflict.go")
	want := []string{"mergetool", "--no-prompt", "--", "src/conflict.go"}
	if len(args) != len(want) {
		t.Fatalf("openMergetoolArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("openMergetoolArgs()=%v want %v", args, want)
		}
	}
}

func TestStageHunkIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	readme := filepath.Join(repo, "README.md")
	original, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cmd := exec.Command("git", "reset", "--hard")
		cmd.Dir = repo
		_ = cmd.Run()
		_ = os.WriteFile(readme, original, 0o644)
	})

	modified := string(original) + "\n# hunk stage line 1\n# hunk stage line 2\n"
	if err := os.WriteFile(readme, []byte(modified), 0o644); err != nil {
		t.Fatal(err)
	}

	diff, err := GetFileDiff(repo, "README.md", false)
	if err != nil {
		t.Fatalf("GetFileDiff: %v", err)
	}
	if len(diff.Hunks) == 0 {
		t.Fatal("expected at least one hunk")
	}

	if err := StageHunk(repo, "README.md", 0); err != nil {
		t.Fatalf("StageHunk: %v", err)
	}

	stagedDiff, err := GetFileDiff(repo, "README.md", true)
	if err != nil {
		t.Fatalf("GetFileDiff staged: %v", err)
	}
	if len(stagedDiff.Hunks) == 0 {
		t.Fatal("expected staged hunk after StageHunk")
	}

	unstagedDiff, err := GetFileDiff(repo, "README.md", false)
	if err != nil {
		t.Fatalf("GetFileDiff unstaged: %v", err)
	}
	// After staging the only hunk, unstaged diff should be empty.
	if len(unstagedDiff.Hunks) > 0 {
		t.Fatalf("expected no unstaged hunks after staging all changes, got %d", len(unstagedDiff.Hunks))
	}

	if err := UnstageHunk(repo, "README.md", 0); err != nil {
		t.Fatalf("UnstageHunk: %v", err)
	}

	stagedAfter, err := GetFileDiff(repo, "README.md", true)
	if err != nil {
		t.Fatalf("GetFileDiff staged after unstage: %v", err)
	}
	if len(stagedAfter.Hunks) > 0 {
		t.Fatalf("expected no staged hunks after UnstageHunk, got %d", len(stagedAfter.Hunks))
	}
}

func TestDiscardHunkIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	readme := filepath.Join(repo, "README.md")
	original, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cmd := exec.Command("git", "reset", "--hard")
		cmd.Dir = repo
		_ = cmd.Run()
		_ = os.WriteFile(readme, original, 0o644)
	})

	modified := string(original) + "\n# discard hunk line\n"
	if err := os.WriteFile(readme, []byte(modified), 0o644); err != nil {
		t.Fatal(err)
	}

	diff, err := GetFileDiff(repo, "README.md", false)
	if err != nil {
		t.Fatalf("GetFileDiff: %v", err)
	}
	if len(diff.Hunks) == 0 {
		t.Fatal("expected at least one hunk")
	}

	if err := DiscardHunk(repo, "README.md", 0, false); err != nil {
		t.Fatalf("DiscardHunk: %v", err)
	}

	after, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != string(original) {
		t.Fatalf("expected file reverted after DiscardHunk, got:\n%s", string(after))
	}

	unstagedDiff, err := GetFileDiff(repo, "README.md", false)
	if err != nil {
		t.Fatalf("GetFileDiff after discard: %v", err)
	}
	if len(unstagedDiff.Hunks) > 0 {
		t.Fatalf("expected no unstaged hunks after discard, got %d", len(unstagedDiff.Hunks))
	}
}
