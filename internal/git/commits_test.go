package git

import (
	"fmt"
	"strconv"
	"strings"
	"testing"
)

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

func commitRecord(sha, parents, message string) string {
	return sha + "\x1f" + parents + "\x1fAlice\x1fa@example.com\x1f2026-01-01T00:00:00+09:00\x1f" + message + "\x1e"
}

func TestListCommitsPagination(t *testing.T) {
	dir := t.TempDir()
	page1Out := commitRecord("c1", "", "one") + commitRecord("c2", "c1", "two") + commitRecord("c3", "c2", "three")
	page2Out := commitRecord("c3", "c2", "three") + commitRecord("c4", "c3", "four")
	fake := newFakeRunner()
	fake.On("log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat), "--skip=0", "-n", "3").Once().Return(page1Out, nil)
	fake.On("log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat), "--skip=2", "-n", "3").Once().Return(page2Out, nil)
	withFakeRunner(t, fake)

	page1, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
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
		WorktreePath: dir,
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
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("log", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat), "--skip=0", "-n", strconv.Itoa(defaultCommitLimit+1), "feature").
		Return(commitRecord("f1", "", "feature commit"), nil)
	withFakeRunner(t, fake)

	branchResult, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeBranch,
		Branch:       "feature",
		Skip:         0,
		Limit:        defaultCommitLimit,
	})
	if err != nil {
		t.Fatalf("ListCommits branch: %v", err)
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
	fake.AssertCalledPrefix(t, "log", "--topo-order")
}

func TestListBranchHeads(t *testing.T) {
	dir := t.TempDir()
	mergeSHA := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	fake := newFakeRunner()
	fake.On("for-each-ref", "--format=%(refname:short)|%(objecttype)|%(objectname)", "refs/heads/", "refs/remotes/", "refs/tags/").Return(
		"feature|commit|"+mergeSHA+"\nv-light|commit|"+mergeSHA+"\nv-annotated|tag|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\norigin/HEAD|commit|"+mergeSHA,
		nil,
	)
	fake.On("rev-parse", "v-annotated^{commit}").Return(mergeSHA, nil)
	withFakeRunner(t, fake)

	heads, err := ListBranchHeads(dir)
	if err != nil {
		t.Fatalf("ListBranchHeads: %v", err)
	}
	names := make(map[string]string)
	for _, head := range heads {
		names[head.Name] = head.Commit.SHA
	}
	if _, ok := names["feature"]; !ok {
		t.Fatalf("expected feature branch head, got %#v", names)
	}
	if names["v-light"] != mergeSHA {
		t.Fatalf("expected lightweight tag on merge commit, got %q", names["v-light"])
	}
	if names["v-annotated"] != mergeSHA {
		t.Fatalf("expected annotated tag on merge commit, got %q", names["v-annotated"])
	}
	if _, ok := names["origin/HEAD"]; ok {
		t.Fatal("HEAD remote ref should be skipped")
	}
}

func TestCurrentBranch(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "HEAD").Return("main", nil)
	withFakeRunner(t, fake)

	branch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	if branch != "main" {
		t.Fatalf("unexpected current branch: %s", branch)
	}
}
