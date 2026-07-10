package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func initTempRepo(t *testing.T) string {
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

	write("b.txt", "2\n")
	run("add", "b.txt")
	run("commit", "-m", "commit 2")

	run("checkout", "-b", "feature")
	write("c.txt", "3\n")
	run("add", "c.txt")
	run("commit", "-m", "feature commit")

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	run("checkout", defaultBranch)
	write("d.txt", "4\n")
	run("add", "d.txt")
	run("commit", "-m", "main commit")

	run("merge", "feature", "-m", "merge feature")

	return dir
}

func TestParseCommitLog(t *testing.T) {
	raw := "abc123\x1fdef456\x1fAlice\x1falice@example.com\x1f2026-01-01T00:00:00+09:00\x1fhello\nworld\x1e"
	entries := parseCommitLog(raw)
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.SHA != "abc123" {
		t.Fatalf("unexpected sha: %s", entry.SHA)
	}
	if len(entry.Parents) != 1 || entry.Parents[0].SHA != "def456" {
		t.Fatalf("unexpected parents: %+v", entry.Parents)
	}
	if entry.Commit.Author.Name != "Alice" {
		t.Fatalf("unexpected author: %+v", entry.Commit.Author)
	}
	if entry.Commit.Message != "hello\nworld" {
		t.Fatalf("unexpected message: %q", entry.Commit.Message)
	}
}

func TestParseParentsEmpty(t *testing.T) {
	parents := parseParents("")
	if len(parents) != 0 {
		t.Fatalf("expected no parents, got %+v", parents)
	}
}

func TestListCommitsPagination(t *testing.T) {
	repo := initTempRepo(t)

	page1, err := ListCommits(ListCommitsParams{
		WorktreePath: repo,
		Scope:        HistoryScopeAll,
		Skip:         0,
		Limit:        2,
	})
	if err != nil {
		t.Fatalf("ListCommits page1: %v", err)
	}
	if len(page1.Commits) != 2 {
		t.Fatalf("expected 2 commits, got %d", len(page1.Commits))
	}
	if !page1.HasMore {
		t.Fatal("expected hasMore on page1")
	}
	if page1.NextSkip != 2 {
		t.Fatalf("expected nextSkip 2, got %d", page1.NextSkip)
	}

	page2, err := ListCommits(ListCommitsParams{
		WorktreePath: repo,
		Scope:        HistoryScopeAll,
		Skip:         page1.NextSkip,
		Limit:        2,
	})
	if err != nil {
		t.Fatalf("ListCommits page2: %v", err)
	}
	if len(page2.Commits) == 0 {
		t.Fatal("expected commits on page2")
	}
	for _, entry := range page1.Commits {
		for _, other := range page2.Commits {
			if entry.SHA == other.SHA {
				t.Fatalf("duplicate commit across pages: %s", entry.SHA)
			}
		}
	}
}

func TestListCommitsScopeBranch(t *testing.T) {
	repo := initTempRepo(t)

	allResult, err := ListCommits(ListCommitsParams{
		WorktreePath: repo,
		Scope:        HistoryScopeAll,
		Skip:         0,
		Limit:        50,
	})
	if err != nil {
		t.Fatalf("ListCommits all: %v", err)
	}

	branchResult, err := ListCommits(ListCommitsParams{
		WorktreePath: repo,
		Scope:        HistoryScopeBranch,
		Branch:       "feature",
		Skip:         0,
		Limit:        50,
	})
	if err != nil {
		t.Fatalf("ListCommits branch: %v", err)
	}

	if len(allResult.Commits) < len(branchResult.Commits) {
		t.Fatalf("expected all (%d) >= feature (%d)", len(allResult.Commits), len(branchResult.Commits))
	}

	foundFeature := false
	for _, entry := range branchResult.Commits {
		if strings.Contains(entry.Commit.Message, "feature commit") {
			foundFeature = true
			break
		}
	}
	if !foundFeature {
		t.Fatal("expected feature branch commit in branch-scoped result")
	}
}

func TestListBranchHeads(t *testing.T) {
	repo := initTempRepo(t)

	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = repo
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	mergeCommitSHA, err := runGit(repo, "rev-parse", "HEAD")
	if err != nil {
		t.Fatalf("rev-parse HEAD: %v", err)
	}
	mergeCommitSHA = strings.TrimSpace(mergeCommitSHA)

	run("tag", "v-light", mergeCommitSHA)
	run("tag", "-a", "v-annotated", "-m", "annotated tag", mergeCommitSHA)

	heads, err := ListBranchHeads(repo)
	if err != nil {
		t.Fatalf("ListBranchHeads: %v", err)
	}
	if len(heads) < 2 {
		t.Fatalf("expected at least 2 branch heads, got %d", len(heads))
	}

	names := make(map[string]string)
	for _, head := range heads {
		if head.Name == "" || head.Commit.SHA == "" {
			t.Fatalf("invalid branch head: %+v", head)
		}
		names[head.Name] = head.Commit.SHA
	}
	if _, ok := names["feature"]; !ok {
		t.Fatalf("expected feature branch head, got %#v", names)
	}
	if names["v-light"] != mergeCommitSHA {
		t.Fatalf("expected lightweight tag on merge commit, got %q", names["v-light"])
	}
	if names["v-annotated"] != mergeCommitSHA {
		t.Fatalf("expected annotated tag on merge commit, got %q", names["v-annotated"])
	}
}

func TestCurrentBranch(t *testing.T) {
	repo := initTempRepo(t)

	branch, err := CurrentBranch(repo)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	if branch == "" || branch == "HEAD" {
		t.Fatalf("unexpected current branch: %s", branch)
	}
}
