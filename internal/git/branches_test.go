package git

import (
	"errors"
	"strings"
	"testing"
)

func TestCreateBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("switch", "-c", "new-branch").Return("", nil)
	withFakeRunner(t, fake)

	if err := CreateBranch("/repo", "new-branch"); err != nil {
		t.Fatalf("CreateBranch: %v", err)
	}
	fake.AssertCalled(t, "switch", "-c", "new-branch")
}

func TestCreateBranchEmptyName(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := CreateBranch("/repo", "  "); err == nil {
		t.Fatal("expected error for empty branch name")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestDeleteBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "HEAD").Return("main", nil)
	fake.On("branch", "-D", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := DeleteBranch("/repo", "feature", true); err != nil {
		t.Fatalf("DeleteBranch: %v", err)
	}
	fake.AssertCalled(t, "branch", "-D", "feature")
}

func TestDeleteBranchSafeUsesLowerD(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "HEAD").Return("main", nil)
	fake.On("branch", "-d", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := DeleteBranch("/repo", "feature", false); err != nil {
		t.Fatalf("DeleteBranch: %v", err)
	}
	fake.AssertCalled(t, "branch", "-d", "feature")
}

func TestDeleteBranchCurrentRejected(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--abbrev-ref", "HEAD").Return("main", nil)
	withFakeRunner(t, fake)

	if err := DeleteBranch("/repo", "main", true); err == nil {
		t.Fatal("expected error deleting current branch")
	}
	fake.AssertNotCalledPrefix(t, "branch")
}

func TestRenameBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("branch", "-m", "feature", "feature-renamed").Return("", nil)
	withFakeRunner(t, fake)

	if err := RenameBranch("/repo", "feature", "feature-renamed"); err != nil {
		t.Fatalf("RenameBranch: %v", err)
	}
	fake.AssertCalled(t, "branch", "-m", "feature", "feature-renamed")
}

func TestRenameBranchEmptyName(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := RenameBranch("/repo", "feature", "  "); err == nil {
		t.Fatal("expected error for empty new branch name")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestRenameBranchSameNameNoop(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := RenameBranch("/repo", "feature", "feature"); err != nil {
		t.Fatalf("RenameBranch: %v", err)
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestMergeBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("merge", "--no-edit", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := MergeBranch("/repo", "feature"); err != nil {
		t.Fatalf("MergeBranch: %v", err)
	}
	fake.AssertCalled(t, "merge", "--no-edit", "feature")
}

func TestSquashMergeBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("merge", "--squash", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := SquashMergeBranch("/repo", "feature"); err != nil {
		t.Fatalf("SquashMergeBranch: %v", err)
	}
	fake.AssertCalled(t, "merge", "--squash", "feature")
}

func TestResetToCommit(t *testing.T) {
	fake := newFakeRunner()
	fake.On("reset", "--hard", "abc123").Return("", nil)
	withFakeRunner(t, fake)

	if err := ResetToCommit("/repo", "abc123", ResetHard); err != nil {
		t.Fatalf("ResetToCommit: %v", err)
	}
	fake.AssertCalled(t, "reset", "--hard", "abc123")
}

func TestResetToCommitInvalidMode(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := ResetToCommit("/repo", "HEAD", ResetMode("bogus")); err == nil {
		t.Fatal("expected error for invalid mode")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestParseUpstreamTrack(t *testing.T) {
	tests := []struct {
		track      string
		wantAhead  int
		wantBehind int
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
		line        string
		wantName    string
		wantCurrent bool
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
	fake := newFakeRunner()
	fake.On("for-each-ref", "--format=%(refname:short)|%(HEAD)|%(upstream:short)|%(upstream:track)", "refs/heads/").Return(
		"main|*|origin/main|[ahead 1]\nfeature/foo| |||",
		nil,
	)
	fake.On("for-each-ref", "--format=%(refname:short)", "refs/remotes/").Return(
		"origin/HEAD\norigin/main\norigin/feature/foo",
		nil,
	)
	withFakeRunner(t, fake)

	entries, err := ListBranches("/repo")
	if err != nil {
		t.Fatalf("ListBranches: %v", err)
	}

	local := map[string]BranchEntry{}
	var remotes []string
	for _, entry := range entries {
		if entry.IsRemote {
			remotes = append(remotes, entry.Name)
			continue
		}
		local[entry.Name] = entry
	}

	if !local["main"].IsCurrent || !local["main"].HasUpstream || local["main"].AheadCount != 1 {
		t.Fatalf("unexpected main entry: %+v", local["main"])
	}
	if local["feature/foo"].IsCurrent || local["feature/foo"].HasUpstream {
		t.Fatalf("unexpected feature entry: %+v", local["feature/foo"])
	}
	if len(remotes) != 2 {
		t.Fatalf("expected 2 remotes (HEAD skipped), got %v", remotes)
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

func TestSwitchBranch(t *testing.T) {
	fake := newFakeRunner()
	fake.On("switch", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := SwitchBranch("/repo", "feature"); err != nil {
		t.Fatalf("SwitchBranch: %v", err)
	}
	fake.AssertCalled(t, "switch", "feature")
}

func TestSwitchBranchEmptyName(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := SwitchBranch("/repo", "  "); err == nil {
		t.Fatal("expected error for empty branch name")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}

func TestCheckoutRemoteBranchCreatesTracking(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "refs/heads/feature").Return("", errors.New("missing"))
	fake.On("switch", "-c", "feature", "--track", "origin/feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := CheckoutRemoteBranch("/repo", "origin/feature"); err != nil {
		t.Fatalf("CheckoutRemoteBranch: %v", err)
	}
	fake.AssertCalled(t, "switch", "-c", "feature", "--track", "origin/feature")
}

func TestCheckoutRemoteBranchExistingLocal(t *testing.T) {
	fake := newFakeRunner()
	fake.On("rev-parse", "--verify", "refs/heads/feature").Return("abc", nil)
	fake.On("switch", "feature").Return("", nil)
	withFakeRunner(t, fake)

	if err := CheckoutRemoteBranch("/repo", "origin/feature"); err != nil {
		t.Fatalf("CheckoutRemoteBranch: %v", err)
	}
	fake.AssertCalled(t, "switch", "feature")
	fake.AssertNotCalledPrefix(t, "switch", "-c")
}

func TestCheckoutRemoteBranchInvalid(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)
	if err := CheckoutRemoteBranch("/repo", "origin"); err == nil {
		t.Fatal("expected error for invalid remote ref")
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}
