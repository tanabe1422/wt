package git

import (
	"errors"
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
	fake.On("for-each-ref", "--format=%(refname:short)|%(objectname)|%(*objectname)", "refs/heads/", "refs/remotes/", "refs/tags/").Return(
		"feature|"+mergeSHA+"|\nv-light|"+mergeSHA+"|\nv-annotated|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|"+mergeSHA+"\norigin/HEAD|"+mergeSHA+"|",
		nil,
	)
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

func TestPathspecForSearchQuery(t *testing.T) {
	tests := []struct {
		query string
		want  string
	}{
		{query: "hoge.tsx", want: ":(glob)**/*hoge.tsx*"},
		{query: "./hoge.tsx", want: "./hoge.tsx"},
		{query: "src/foo/hoge.tsx", want: "src/foo/hoge.tsx"},
		{query: "src/components", want: "src/components"},
	}
	for _, tt := range tests {
		got := pathspecForSearchQuery(tt.query)
		if got != tt.want {
			t.Fatalf("pathspecForSearchQuery(%q) = %q, want %q", tt.query, got, tt.want)
		}
	}
}

func TestListCommitsSearchMessage(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "-i", "--grep=scaffold",
	).Return(commitRecord("c2", "c1", "feat: scaffold history view"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchMessage,
		SearchQuery:  "scaffold",
	})
	if err != nil {
		t.Fatalf("ListCommits message: %v", err)
	}
	if len(result.Commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(result.Commits))
	}
	fake.AssertCalled(t,
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "-i", "--grep=scaffold",
	)
}

func TestListCommitsSearchAuthor(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "--author=Bob",
	).Return(commitRecord("c3", "c2", "feature/bar: add panel"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchAuthor,
		SearchQuery:  "Bob",
	})
	if err != nil {
		t.Fatalf("ListCommits author: %v", err)
	}
	if len(result.Commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(result.Commits))
	}
}

func TestListCommitsSearchPathFilename(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "--", ":(glob)**/*hoge.tsx*",
	).Return(commitRecord("c2", "c1", "add hoge"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchPath,
		SearchQuery:  "hoge.tsx",
	})
	if err != nil {
		t.Fatalf("ListCommits path filename: %v", err)
	}
	if len(result.Commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(result.Commits))
	}
}

func TestListCommitsSearchPathRootRelative(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "--", "./hoge.tsx",
	).Return(commitRecord("c1", "", "root hoge"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchPath,
		SearchQuery:  "./hoge.tsx",
	})
	if err != nil {
		t.Fatalf("ListCommits path root: %v", err)
	}
	if len(result.Commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(result.Commits))
	}
}

func TestListCommitsSearchPathPrefix(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51", "--", "src/foo/hoge.tsx",
	).Return(commitRecord("c2", "c1", "nested hoge"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchPath,
		SearchQuery:  "src/foo/hoge.tsx",
	})
	if err != nil {
		t.Fatalf("ListCommits path prefix: %v", err)
	}
	if len(result.Commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(result.Commits))
	}
}

func TestListCommitsSearchSHA(t *testing.T) {
	dir := t.TempDir()
	full := "c1000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "c1000002^{commit}").Return(full, nil)
	fake.On(
		"log", "-1", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat), full,
	).Return(commitRecord(full, "c1000001", "feat: scaffold"), nil)
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchSHA,
		SearchQuery:  "c1000002",
	})
	if err != nil {
		t.Fatalf("ListCommits sha: %v", err)
	}
	if len(result.Commits) != 1 || result.Commits[0].SHA != full {
		t.Fatalf("unexpected result: %+v", result.Commits)
	}
	if result.HasMore {
		t.Fatal("sha search should not have more")
	}
}

func TestListCommitsSearchSHAUnresolved(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "zzzzzzz^{commit}").Return("", errors.New("bad object"))
	withFakeRunner(t, fake)

	result, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		SearchType:   CommitSearchSHA,
		SearchQuery:  "zzzzzzz",
	})
	if err != nil {
		t.Fatalf("ListCommits unresolved sha: %v", err)
	}
	if len(result.Commits) != 0 {
		t.Fatalf("expected empty, got %+v", result.Commits)
	}
}

func TestListCommitsEmptyQueryIgnoresSearchType(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On(
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51",
	).Return(commitRecord("c1", "", "one"), nil)
	withFakeRunner(t, fake)

	_, err := ListCommits(ListCommitsParams{
		WorktreePath: dir,
		Scope:        HistoryScopeAll,
		SearchType:   CommitSearchMessage,
		SearchQuery:  "   ",
	})
	if err != nil {
		t.Fatalf("ListCommits empty query: %v", err)
	}
	fake.AssertCalled(t,
		"log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat),
		"--skip=0", "-n", "51",
	)
	fake.AssertNotCalledPrefix(t, "log", "--all", "--topo-order", fmt.Sprintf("--format=%s", commitLogFormat), "--skip=0", "-n", "51", "-i")
}
