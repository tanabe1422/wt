package git

import (
	"os/exec"
	"strings"
	"testing"
)

func TestGetStatus(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("?? status-test-tmp.txt", nil)
	fake.On("ls-files", "-s", "--", "status-test-tmp.txt").Return("", nil)
	withFakeRunner(t, fake)

	entries, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}
	if len(entries) != 1 || entries[0].Path != "status-test-tmp.txt" {
		t.Fatalf("unexpected entries: %+v", entries)
	}
	fake.AssertCalledPrefix(t, "status", "--porcelain=v1", "-u")
	fake.AssertCalled(t, "ls-files", "-s", "--", "status-test-tmp.txt")
}

func TestGetStatusMarksGitlinksAsDirectory(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("M  vendor/lib\n M README.md", nil)
	fake.On("ls-files", "-s", "--", "vendor/lib", "README.md").Return(
		"160000 abcdef0123456789abcdef0123456789abcdef01 0\tvendor/lib\n100644 deadbeefdeadbeefdeadbeefdeadbeefdeadbeef 0\tREADME.md",
		nil,
	)
	withFakeRunner(t, fake)

	entries, err := GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("unexpected entries: %+v", entries)
	}
	if !entries[0].IsDirectory || entries[0].Path != "vendor/lib" {
		t.Fatalf("expected gitlink marked as directory, got %+v", entries[0])
	}
	if entries[1].IsDirectory || entries[1].Path != "README.md" {
		t.Fatalf("expected regular file, got %+v", entries[1])
	}
	if n := len(fake.Calls()); n != 2 {
		t.Fatalf("expected 2 git calls (status + one ls-files), got %d: %v", n, fake.ArgsList())
	}
}

func TestStagedGitlinkPaths(t *testing.T) {
	got := stagedGitlinkPaths("160000 abc 0\tsub/mod\n100644 def 0\tfile.go\n160000 ghi 0\tother")
	if !got["sub/mod"] || !got["other"] || got["file.go"] {
		t.Fatalf("unexpected gitlinks: %#v", got)
	}
}

func TestStageCommit(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("add", "--", "README.md").Return("", nil)
	fake.On("commit", "-m", "test commit from unit").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageFiles(dir, []string{"README.md"}); err != nil {
		t.Fatalf("StageFiles: %v", err)
	}
	if err := Commit(dir, "test commit from unit"); err != nil {
		t.Fatalf("Commit: %v", err)
	}
	fake.AssertCalled(t, "add", "--", "README.md")
	fake.AssertCalled(t, "commit", "-m", "test commit from unit")
}

func TestStageAll(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return(" M a.txt\n?? b.txt", nil)
	fake.On("ls-files", "-s", "--", "a.txt", "b.txt").Return("", nil)
	fake.On("add", "--", "a.txt", "b.txt").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageAll(dir); err != nil {
		t.Fatalf("StageAll: %v", err)
	}
	fake.AssertCalled(t, "add", "--", "a.txt", "b.txt")
}

func TestStageAllExcludesUnmerged(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("UU conflict.txt\n M ok.go", nil)
	fake.On("ls-files", "-s", "--", "conflict.txt", "ok.go").Return("", nil)
	fake.On("add", "--", "ok.go").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageAll(dir); err != nil {
		t.Fatalf("StageAll: %v", err)
	}
	fake.AssertCalled(t, "add", "--", "ok.go")
}

func TestUnstageAll(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("status", "--porcelain=v1", "-u").Return("M  a.txt\nA  b.txt", nil)
	fake.On("ls-files", "-s", "--", "a.txt", "b.txt").Return("", nil)
	fake.On("restore", "--staged", "--", "a.txt", "b.txt").Return("", nil)
	withFakeRunner(t, fake)

	if err := UnstageAll(dir); err != nil {
		t.Fatalf("UnstageAll: %v", err)
	}
	fake.AssertCalled(t, "restore", "--staged", "--", "a.txt", "b.txt")
}

func TestFetchArgs(t *testing.T) {
	args := fetchArgs(false)
	if len(args) != 2 || args[0] != "fetch" || args[1] != "--progress" {
		t.Fatalf("fetchArgs(false)=%v want [fetch --progress]", args)
	}
}

func TestFetchPruneArgs(t *testing.T) {
	args := fetchArgs(true)
	if len(args) != 3 || args[0] != "fetch" || args[1] != "--prune" || args[2] != "--progress" {
		t.Fatalf("fetchArgs(true)=%v want [fetch --prune --progress]", args)
	}
}

func TestParseUpstreamRef(t *testing.T) {
	cases := []struct {
		ref            string
		remote, branch string
		ok             bool
	}{
		{"origin/main", "origin", "main", true},
		{"upstream/feature/foo", "upstream", "feature/foo", true},
		{"main", "", "", false},
		{"", "", "", false},
		{"/main", "", "", false},
	}
	for _, tc := range cases {
		remote, branch, ok := parseUpstreamRef(tc.ref)
		if remote != tc.remote || branch != tc.branch || ok != tc.ok {
			t.Fatalf("parseUpstreamRef(%q) = (%q, %q, %v), want (%q, %q, %v)",
				tc.ref, remote, branch, ok, tc.remote, tc.branch, tc.ok)
		}
	}
}

func TestFetchCurrentUpstreamArgs(t *testing.T) {
	args := fetchCurrentUpstreamArgs("origin", "feature/foo")
	want := []string{"fetch", "--progress", "origin", "feature/foo"}
	if len(args) != len(want) {
		t.Fatalf("fetchCurrentUpstreamArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("fetchCurrentUpstreamArgs()=%v want %v", args, want)
		}
	}
}

func TestFetchCurrentUpstream(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("fetch", "--progress", "origin", "main").Return("", nil)
	withFakeRunner(t, fake)

	if err := FetchCurrentUpstream(dir); err != nil {
		t.Fatalf("FetchCurrentUpstream: %v", err)
	}
	fake.AssertCalled(t, "fetch", "--progress", "origin", "main")
}

func TestFetchCurrentUpstreamNoUpstream(t *testing.T) {
	dir := initHotpathRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("checkout", "-b", "no-up")

	if err := FetchCurrentUpstream(dir); err == nil {
		t.Fatal("expected error when upstream is missing")
	}
}

func TestParsePrunedRefs(t *testing.T) {
	out := strings.Join([]string{
		"From https://example.com/repo.git",
		" * [new branch]      main       -> origin/main",
		" x [deleted]         (none)     -> origin/feature/old",
		" x [deleted]         (none)     -> origin/bugfix",
		"   abc1234..def5678  main       -> origin/main",
	}, "\n")
	got := parsePrunedRefs(out)
	want := []string{"origin/feature/old", "origin/bugfix"}
	if len(got) != len(want) {
		t.Fatalf("parsePrunedRefs()=%v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("parsePrunedRefs()[%d]=%q want %q", i, got[i], want[i])
		}
	}
}

func TestParsePrunedRefsEmpty(t *testing.T) {
	if refs := parsePrunedRefs("From https://example.com/repo.git\n"); len(refs) != 0 {
		t.Fatalf("parsePrunedRefs()=%v want []", refs)
	}
}

func TestPullArgs(t *testing.T) {
	args := pullArgs()
	if len(args) != 2 || args[0] != "pull" || args[1] != "--progress" {
		t.Fatalf("pullArgs()=%v want [pull --progress]", args)
	}
}

func TestPullForceResetArgs(t *testing.T) {
	args := pullForceResetArgs("origin/main")
	want := []string{"reset", "--hard", "origin/main"}
	if len(args) != len(want) {
		t.Fatalf("pullForceResetArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("pullForceResetArgs()=%v want %v", args, want)
		}
	}
}

func TestPullForce(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("fetch", "--progress", "origin", "main").Return("", nil)
	fake.On("reset", "--hard", "origin/main").Return("", nil)
	withFakeRunner(t, fake)

	if err := PullForce(dir); err != nil {
		t.Fatalf("PullForce: %v", err)
	}
	fake.AssertCalled(t, "fetch", "--progress", "origin", "main")
	fake.AssertCalled(t, "reset", "--hard", "origin/main")
}

func TestPullForceNoUpstream(t *testing.T) {
	dir := initHotpathRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("checkout", "-b", "no-up")

	if err := PullForce(dir); err == nil {
		t.Fatal("expected error when upstream is missing")
	}
}

func TestPushArgs(t *testing.T) {
	args := pushArgs()
	if len(args) != 2 || args[0] != "push" || args[1] != "--progress" {
		t.Fatalf("pushArgs()=%v want [push --progress]", args)
	}
}

func TestPushForceArgs(t *testing.T) {
	args := pushForceArgs()
	want := []string{"push", "--force-with-lease", "--progress"}
	if len(args) != len(want) {
		t.Fatalf("pushForceArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("pushForceArgs()=%v want %v", args, want)
		}
	}
}

func TestPushForce(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("push", "--force-with-lease", "--progress").Return("", nil)
	withFakeRunner(t, fake)

	if err := PushForce(dir); err != nil {
		t.Fatalf("PushForce: %v", err)
	}
	fake.AssertCalled(t, "push", "--force-with-lease", "--progress")
}

func TestPushSetUpstreamArgs(t *testing.T) {
	tests := []struct {
		remote string
		want   []string
	}{
		{"", []string{"push", "--progress", "-u", "origin", "HEAD"}},
		{"  ", []string{"push", "--progress", "-u", "origin", "HEAD"}},
		{"upstream", []string{"push", "--progress", "-u", "upstream", "HEAD"}},
		{"  origin  ", []string{"push", "--progress", "-u", "origin", "HEAD"}},
	}
	for _, tc := range tests {
		got := pushSetUpstreamArgs(tc.remote)
		if len(got) != len(tc.want) {
			t.Fatalf("pushSetUpstreamArgs(%q)=%v want %v", tc.remote, got, tc.want)
		}
		for i := range tc.want {
			if got[i] != tc.want[i] {
				t.Fatalf("pushSetUpstreamArgs(%q)=%v want %v", tc.remote, got, tc.want)
			}
		}
	}
}

func TestOpenMergetoolArgs(t *testing.T) {
	args, err := openMergetoolArgs("src/conflict.go", `C:\Program Files\tool.exe`, "$LOCAL $REMOTE $BASE $MERGED")
	if err != nil {
		t.Fatal(err)
	}
	wantCmd := wrapMergetoolCmd(`'C:\Program Files\tool.exe' $LOCAL $REMOTE $BASE $MERGED`)
	want := []string{
		"-c", "merge.tool=wtmanager",
		"-c", "mergetool.wtmanager.cmd=" + wantCmd,
		"-c", "mergetool.wtmanager.trustExitCode=true",
		"-c", "mergetool.keepBackup=false",
		"mergetool", "--no-prompt", "--", "src/conflict.go",
	}
	if len(args) != len(want) {
		t.Fatalf("openMergetoolArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("openMergetoolArgs()[%d]=%q want %q\nfull=%v", i, args[i], want[i], args)
		}
	}
}

func TestWrapMergetoolCmd(t *testing.T) {
	got := wrapMergetoolCmd("tool $LOCAL $MERGED")
	if !strings.Contains(got, "grep -q '^<<<<<<<'") {
		t.Fatalf("missing conflict-marker guard: %s", got)
	}
	if !strings.HasPrefix(got, "tool $LOCAL $MERGED;") {
		t.Fatalf("tool command should come first: %s", got)
	}
}

func TestOpenMergetoolArgsRequiresPath(t *testing.T) {
	_, err := openMergetoolArgs("src/conflict.go", "", "$LOCAL $REMOTE")
	if err == nil {
		t.Fatal("expected error for empty tool path")
	}
}

func TestOpenDifftoolArgs(t *testing.T) {
	args, err := openDifftoolArgs("README.md", false, "code", "--wait --diff $LOCAL $REMOTE")
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"-c", "diff.tool=wtmanager",
		"-c", "difftool.wtmanager.cmd=code --wait --diff $LOCAL $REMOTE",
		"-c", "difftool.prompt=false",
		"difftool", "--no-prompt", "--", "README.md",
	}
	if len(args) != len(want) {
		t.Fatalf("openDifftoolArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("openDifftoolArgs()[%d]=%q want %q\nfull=%v", i, args[i], want[i], args)
		}
	}

	cached, err := openDifftoolArgs("README.md", true, "code", "--wait --diff $LOCAL $REMOTE")
	if err != nil {
		t.Fatal(err)
	}
	if cached[len(cached)-3] != "--cached" {
		t.Fatalf("staged args missing --cached: %v", cached)
	}
}

func TestOpenDifftoolBetweenArgs(t *testing.T) {
	args, err := openDifftoolBetweenArgs(
		"abc123^",
		"abc123",
		"src/App.tsx",
		"code",
		"--wait --diff $LOCAL $REMOTE",
	)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"-c", "diff.tool=wtmanager",
		"-c", "difftool.wtmanager.cmd=code --wait --diff $LOCAL $REMOTE",
		"-c", "difftool.prompt=false",
		"difftool", "--no-prompt",
		"abc123^", "abc123",
		"--", "src/App.tsx",
	}
	if len(args) != len(want) {
		t.Fatalf("openDifftoolBetweenArgs()=%v want %v", args, want)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("openDifftoolBetweenArgs()[%d]=%q want %q\nfull=%v", i, args[i], want[i], args)
		}
	}

	_, err = openDifftoolBetweenArgs("a", "b", "f.txt", "", "$LOCAL $REMOTE")
	if err == nil {
		t.Fatal("expected error for empty tool path")
	}
}

func TestBuildToolCmd(t *testing.T) {
	cmd, err := buildToolCmd(`C:\Tools\diff.exe`, "$LOCAL $REMOTE")
	if err != nil {
		t.Fatal(err)
	}
	if cmd != `'C:\Tools\diff.exe' $LOCAL $REMOTE` {
		t.Fatalf("got %q", cmd)
	}

	quoted, err := buildToolCmd(`C:\Program Files\App\app.exe`, "$LOCAL $REMOTE")
	if err != nil {
		t.Fatal(err)
	}
	if quoted != `'C:\Program Files\App\app.exe' $LOCAL $REMOTE` {
		t.Fatalf("got %q", quoted)
	}

	plain, err := buildToolCmd("code", "--wait --diff $LOCAL $REMOTE")
	if err != nil {
		t.Fatal(err)
	}
	if plain != "code --wait --diff $LOCAL $REMOTE" {
		t.Fatalf("got %q", plain)
	}
}

func TestDiscardFiles(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("restore", "--worktree", "--", "README.md").Return("", nil)
	withFakeRunner(t, fake)

	if err := DiscardFiles(dir, []string{"README.md"}); err != nil {
		t.Fatalf("DiscardFiles: %v", err)
	}
	fake.AssertCalled(t, "restore", "--worktree", "--", "README.md")
}

func TestDeleteUntracked(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("clean", "-fd", "--", "tmp-untracked.txt").Return("", nil)
	withFakeRunner(t, fake)

	if err := DeleteUntracked(dir, []string{"tmp-untracked.txt"}); err != nil {
		t.Fatalf("DeleteUntracked: %v", err)
	}
	fake.AssertCalled(t, "clean", "-fd", "--", "tmp-untracked.txt")
}

func TestDiscardAllChanges(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("reset", "--hard").Return("", nil)
	fake.On("clean", "-fd").Return("", nil)
	withFakeRunner(t, fake)

	if err := DiscardAllChanges(dir); err != nil {
		t.Fatalf("DiscardAllChanges: %v", err)
	}
	fake.AssertCalled(t, "reset", "--hard")
	fake.AssertCalled(t, "clean", "-fd")
}

func TestAbortMerge(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "MERGE_HEAD", "abc\n")

	fake := newFakeRunner()
	fake.On("merge", "--abort").Return("", nil)
	withFakeRunner(t, fake)

	if err := AbortMerge(dir); err != nil {
		t.Fatalf("AbortMerge: %v", err)
	}
	fake.AssertCalled(t, "merge", "--abort")
}

func TestAbortSquashMerge(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "SQUASH_MSG", "squash")

	fake := newFakeRunner()
	fake.On("reset", "--merge").Return("", nil)
	withFakeRunner(t, fake)

	if err := AbortMerge(dir); err != nil {
		t.Fatalf("AbortMerge squash: %v", err)
	}
	fake.AssertCalled(t, "reset", "--merge")
	fake.AssertNotCalledPrefix(t, "merge", "--abort")
}

func TestStageHunk(t *testing.T) {
	dir := t.TempDir()
	diffBody := "diff --git a/README.md b/README.md\n" +
		"--- a/README.md\n+++ b/README.md\n" +
		"@@ -1,1 +1,2 @@\n line\n+added\n"
	fake := newFakeRunner()
	fake.On("diff", "-U3", "--", "README.md").Return(diffBody, nil)
	fake.On("apply", "--cached").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageHunk(dir, "README.md", 0); err != nil {
		t.Fatalf("StageHunk: %v", err)
	}
	fake.AssertCalledPrefix(t, "apply", "--cached")
	calls := fake.Calls()
	var applyCall *fakeCall
	for i := range calls {
		if len(calls[i].Args) >= 1 && calls[i].Args[0] == "apply" {
			applyCall = &calls[i]
			break
		}
	}
	if applyCall == nil || applyCall.Stdin == "" {
		t.Fatal("expected apply with patch stdin")
	}
}

func TestGetAmendInfoNoUpstream(t *testing.T) {
	dir := initHotpathRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("checkout", "-b", "no-up")

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if !info.CanAmend {
		t.Fatalf("expected CanAmend, got %+v", info)
	}
	if info.HeadMessage == "" {
		t.Fatal("expected non-empty head message")
	}
}

func TestGetAmendInfoBlocksWhenSyncedWithUpstream(t *testing.T) {
	dir := initHotpathRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	// Point upstream at current HEAD so ahead == 0.
	run("update-ref", "refs/remotes/origin/main", "HEAD")

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if info.CanAmend {
		t.Fatal("expected CanAmend=false when synced")
	}
	if !strings.Contains(info.Reason, "プッシュ済み") {
		t.Fatalf("unexpected reason: %q", info.Reason)
	}
}

func TestAmendCommitAllowsWhenAhead(t *testing.T) {
	dir := initHotpathRepo(t)
	fake := newFakeRunner()
	fake.On("commit", "--amend", "-m", "amended message").Return("", nil)
	withFakeRunner(t, fake)

	if err := AmendCommit(dir, "amended message"); err != nil {
		t.Fatalf("AmendCommit: %v", err)
	}
	fake.AssertCalled(t, "commit", "--amend", "-m", "amended message")
}

func TestAmendCommitRejectsWhenSynced(t *testing.T) {
	dir := initHotpathRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("update-ref", "refs/remotes/origin/main", "HEAD")

	err := AmendCommit(dir, "should fail")
	if err == nil {
		t.Fatal("expected amend to fail when synced")
	}
	if !strings.Contains(err.Error(), "プッシュ済み") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestGetAmendInfoBlocksWhileMerging(t *testing.T) {
	dir := initHotpathRepo(t)
	writeGitStateFile(t, dir, "MERGE_HEAD", "def\n")

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if info.CanAmend {
		t.Fatal("expected CanAmend=false while merging")
	}
	if !strings.Contains(info.Reason, "マージ中") {
		t.Fatalf("unexpected reason: %q", info.Reason)
	}
}

func TestStageHunkOutOfRange(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("diff", "-U3", "--", "README.md").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageHunk(dir, "README.md", 0); err == nil {
		t.Fatal("expected out-of-range error")
	}
}

func TestStageLines(t *testing.T) {
	dir := t.TempDir()
	diffBody := "diff --git a/README.md b/README.md\n" +
		"--- a/README.md\n+++ b/README.md\n" +
		"@@ -1,1 +1,3 @@\n line\n+added1\n+added2\n"
	fake := newFakeRunner()
	fake.On("diff", "-U3", "--", "README.md").Return(diffBody, nil)
	fake.On("apply", "--cached").Return("", nil)
	withFakeRunner(t, fake)

	// Index 2 is the second add line ("added2").
	if err := StageLines(dir, "README.md", 0, []int{2}); err != nil {
		t.Fatalf("StageLines: %v", err)
	}
	fake.AssertCalledPrefix(t, "apply", "--cached")
	calls := fake.Calls()
	var applyCall *fakeCall
	for i := range calls {
		if len(calls[i].Args) >= 1 && calls[i].Args[0] == "apply" {
			applyCall = &calls[i]
			break
		}
	}
	if applyCall == nil {
		t.Fatal("expected apply call")
	}
	if !strings.Contains(applyCall.Stdin, "+added2") {
		t.Fatalf("expected selected add in patch:\n%s", applyCall.Stdin)
	}
	if strings.Contains(applyCall.Stdin, "+added1") {
		t.Fatalf("unselected add must be omitted:\n%s", applyCall.Stdin)
	}
}

func TestDiscardLines(t *testing.T) {
	dir := t.TempDir()
	diffBody := "diff --git a/README.md b/README.md\n" +
		"--- a/README.md\n+++ b/README.md\n" +
		"@@ -1,1 +1,2 @@\n line\n+added\n"
	fake := newFakeRunner()
	fake.On("diff", "-U3", "--", "README.md").Return(diffBody, nil)
	fake.On("apply", "--reverse").Return("", nil)
	withFakeRunner(t, fake)

	if err := DiscardLines(dir, "README.md", 0, []int{1}, false); err != nil {
		t.Fatalf("DiscardLines: %v", err)
	}
	fake.AssertCalledPrefix(t, "apply", "--reverse")
}

func TestStageLinesEmpty(t *testing.T) {
	dir := t.TempDir()
	if err := StageLines(dir, "README.md", 0, nil); err == nil {
		t.Fatal("expected empty selection error")
	}
}
