package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func initBranchOpRepo(t *testing.T) string {
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

	write := func(name, content string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	write("a.txt", "1\n")
	run("add", "a.txt")
	run("commit", "-m", "commit 1")

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}

	run("checkout", "-b", "feature")
	write("b.txt", "2\n")
	run("add", "b.txt")
	run("commit", "-m", "feature commit")

	run("checkout", defaultBranch)
	return dir
}

func TestCreateBranch(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := CreateBranch(dir, "new-branch"); err != nil {
		t.Fatalf("CreateBranch: %v", err)
	}
	current, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	if current != "new-branch" {
		t.Fatalf("expected new-branch, got %q", current)
	}
}

func TestCreateBranchEmptyName(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := CreateBranch(dir, "  "); err == nil {
		t.Fatal("expected error for empty branch name")
	}
}

func TestDeleteBranch(t *testing.T) {
	dir := initBranchOpRepo(t)
	// feature is not merged; force delete is required
	if err := DeleteBranch(dir, "feature", true); err != nil {
		t.Fatalf("DeleteBranch: %v", err)
	}
	entries, err := ListBranches(dir)
	if err != nil {
		t.Fatalf("ListBranches: %v", err)
	}
	for _, entry := range entries {
		if !entry.IsRemote && entry.Name == "feature" {
			t.Fatal("feature branch should be deleted")
		}
	}
}

func TestDeleteBranchSafeRejectsUnmerged(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := DeleteBranch(dir, "feature", false); err == nil {
		t.Fatal("expected error deleting unmerged branch without force")
	}
}

func TestDeleteBranchCurrentRejected(t *testing.T) {
	dir := initBranchOpRepo(t)
	current, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	if err := DeleteBranch(dir, current, true); err == nil {
		t.Fatal("expected error deleting current branch")
	}
}

func TestMergeBranch(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := MergeBranch(dir, "feature"); err != nil {
		t.Fatalf("MergeBranch: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "b.txt")); err != nil {
		t.Fatalf("expected b.txt after merge: %v", err)
	}
}

func TestSquashMergeBranch(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := SquashMergeBranch(dir, "feature"); err != nil {
		t.Fatalf("SquashMergeBranch: %v", err)
	}
	entries, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}
	var found bool
	for _, entry := range entries {
		if entry.Path == "b.txt" && HasStagedChange(entry) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected staged b.txt after squash merge, got: %+v", entries)
	}
}

func TestResetToCommit(t *testing.T) {
	dir := initBranchOpRepo(t)
	firstSHA, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatalf("rev-parse first: %v", err)
	}

	if err := os.WriteFile(filepath.Join(dir, "c.txt"), []byte("3\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("git", "add", "c.txt")
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git add: %v\n%s", err, out)
	}
	cmd = exec.Command("git", "commit", "-m", "commit 2")
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git commit: %v\n%s", err, out)
	}

	if err := ResetToCommit(dir, firstSHA, ResetHard); err != nil {
		t.Fatalf("ResetToCommit: %v", err)
	}
	head, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatalf("rev-parse: %v", err)
	}
	if head != firstSHA {
		t.Fatalf("HEAD = %q, want %q", head, firstSHA)
	}
	if _, err := os.Stat(filepath.Join(dir, "c.txt")); !os.IsNotExist(err) {
		t.Fatal("c.txt should be removed after hard reset")
	}
}

func TestResetToCommitInvalidMode(t *testing.T) {
	dir := initBranchOpRepo(t)
	if err := ResetToCommit(dir, "HEAD", ResetMode("bogus")); err == nil {
		t.Fatal("expected error for invalid mode")
	}
}

func TestParseUpstreamTrack(t *testing.T) {
	tests := []struct {
		track       string
		wantAhead   int
		wantBehind  int
	}{
		{"", 0, 0},
		{"[gone]", 0, 0},
		{"[ahead 2]", 2, 0},
		{"[behind 1]", 0, 1},
		{"[behind 1, ahead 3]", 3, 1},
		{"[ahead 23]", 23, 0},
	}

	for _, tc := range tests {
		ahead, behind := parseUpstreamTrack(tc.track)
		if ahead != tc.wantAhead || behind != tc.wantBehind {
			t.Fatalf("parseUpstreamTrack(%q) = (%d, %d), want (%d, %d)",
				tc.track, ahead, behind, tc.wantAhead, tc.wantBehind)
		}
	}
}

func TestParseBranchRefLine(t *testing.T) {
	tests := []struct {
		line         string
		wantName     string
		wantCurrent  bool
	}{
		{"main|*", "main", true},
		{"feature/foo| ", "feature/foo", false},
		{"bugfix/bar|", "bugfix/bar", false},
	}

	for _, tc := range tests {
		parts := strings.SplitN(tc.line, "|", 2)
		name := strings.TrimSpace(parts[0])
		isCurrent := len(parts) > 1 && parts[1] == "*"
		if name != tc.wantName || isCurrent != tc.wantCurrent {
			t.Fatalf("line %q => name=%q current=%v, want name=%q current=%v",
				tc.line, name, isCurrent, tc.wantName, tc.wantCurrent)
		}
	}
}

func TestListBranches(t *testing.T) {
	repoPath := filepath.Join("..", "..", "sample-repo")
	if _, err := os.Stat(repoPath); err != nil {
		t.Skip("sample-repo not found")
	}

	entries, err := ListBranches(repoPath)
	if err != nil {
		t.Fatalf("ListBranches: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected branches")
	}

	localNames := make(map[string]BranchEntry)
	for _, entry := range entries {
		if entry.IsRemote {
			continue
		}
		localNames[entry.Name] = entry
	}

	for _, want := range []string{"main", "feature/add-logging", "feature/add-config", "fix/typo"} {
		if _, ok := localNames[want]; !ok {
			t.Fatalf("missing local branch %q", want)
		}
	}

	var currentCount int
	for _, entry := range entries {
		if !entry.IsRemote && entry.IsCurrent {
			currentCount++
		}
	}
	if currentCount != 1 {
		t.Fatalf("expected exactly one current local branch, got %d", currentCount)
	}
}

func TestLocalBranchFromRemote(t *testing.T) {
	tests := []struct {
		remoteRef string
		want      string
		wantErr   bool
	}{
		{"origin/main", "main", false},
		{"origin/feature/foo", "feature/foo", false},
		{"upstream/release/1.0", "release/1.0", false},
		{"origin", "", true},
		{"origin/", "", true},
		{"", "", true},
	}

	for _, tc := range tests {
		got, err := localBranchFromRemote(tc.remoteRef)
		if tc.wantErr {
			if err == nil {
				t.Fatalf("localBranchFromRemote(%q) expected error", tc.remoteRef)
			}
			continue
		}
		if err != nil {
			t.Fatalf("localBranchFromRemote(%q): %v", tc.remoteRef, err)
		}
		if got != tc.want {
			t.Fatalf("localBranchFromRemote(%q) = %q, want %q", tc.remoteRef, got, tc.want)
		}
	}
}
