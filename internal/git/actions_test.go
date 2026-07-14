package git

import (
	"errors"
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

func TestFetchArgs(t *testing.T) {
	args := fetchArgs(false)
	if len(args) != 1 || args[0] != "fetch" {
		t.Fatalf("fetchArgs(false)=%v want [fetch]", args)
	}
}

func TestFetchPruneArgs(t *testing.T) {
	args := fetchArgs(true)
	if len(args) != 2 || args[0] != "fetch" || args[1] != "--prune" {
		t.Fatalf("fetchArgs(true)=%v want [fetch --prune]", args)
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

func TestPushSetUpstreamArgs(t *testing.T) {
	tests := []struct {
		remote string
		want   []string
	}{
		{"", []string{"push", "-u", "origin", "HEAD"}},
		{"  ", []string{"push", "-u", "origin", "HEAD"}},
		{"upstream", []string{"push", "-u", "upstream", "HEAD"}},
		{"  origin  ", []string{"push", "-u", "origin", "HEAD"}},
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
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("merge", "--abort").Return("", nil)
	withFakeRunner(t, fake)

	if err := AbortMerge(dir); err != nil {
		t.Fatalf("AbortMerge: %v", err)
	}
	fake.AssertCalled(t, "merge", "--abort")
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
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "-q", "--verify", "HEAD").Return("abc", nil)
	fake.On("log", "-1", "--format=%B").Return("tip message\n", nil)
	fake.On("rev-parse", "-q", "--verify", "MERGE_HEAD").Return("", errors.New("missing"))
	fake.On("rev-parse", "-q", "--verify", "@{upstream}").Return("", errors.New("no upstream"))
	withFakeRunner(t, fake)

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if !info.CanAmend {
		t.Fatalf("expected CanAmend, got %+v", info)
	}
	if info.HeadMessage != "tip message" {
		t.Fatalf("unexpected message: %q", info.HeadMessage)
	}
}

func TestGetAmendInfoBlocksWhenSyncedWithUpstream(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "-q", "--verify", "HEAD").Return("abc", nil)
	fake.On("log", "-1", "--format=%B").Return("synced tip\n", nil)
	fake.On("rev-parse", "-q", "--verify", "MERGE_HEAD").Return("", errors.New("missing"))
	fake.On("rev-parse", "-q", "--verify", "@{upstream}").Return("origin/main", nil)
	fake.On("rev-list", "--count", "@{upstream}..HEAD").Return("0", nil)
	withFakeRunner(t, fake)

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
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "-q", "--verify", "HEAD").Return("abc", nil)
	fake.On("rev-parse", "-q", "--verify", "MERGE_HEAD").Return("", errors.New("missing"))
	fake.On("rev-parse", "-q", "--verify", "@{upstream}").Return("origin/main", nil)
	fake.On("rev-list", "--count", "@{upstream}..HEAD").Return("1", nil)
	fake.On("commit", "--amend", "-m", "amended message").Return("", nil)
	withFakeRunner(t, fake)

	if err := AmendCommit(dir, "amended message"); err != nil {
		t.Fatalf("AmendCommit: %v", err)
	}
	fake.AssertCalled(t, "commit", "--amend", "-m", "amended message")
}

func TestAmendCommitRejectsWhenSynced(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "-q", "--verify", "HEAD").Return("abc", nil)
	fake.On("rev-parse", "-q", "--verify", "MERGE_HEAD").Return("", errors.New("missing"))
	fake.On("rev-parse", "-q", "--verify", "@{upstream}").Return("origin/main", nil)
	fake.On("rev-list", "--count", "@{upstream}..HEAD").Return("0", nil)
	withFakeRunner(t, fake)

	err := AmendCommit(dir, "should fail")
	if err == nil {
		t.Fatal("expected amend to fail when synced")
	}
	if !strings.Contains(err.Error(), "プッシュ済み") {
		t.Fatalf("unexpected error: %v", err)
	}
	fake.AssertNotCalledPrefix(t, "commit", "--amend")
}

func TestGetAmendInfoBlocksWhileMerging(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-parse", "-q", "--verify", "HEAD").Return("abc", nil)
	fake.On("log", "-1", "--format=%B").Return("during merge\n", nil)
	fake.On("rev-parse", "-q", "--verify", "MERGE_HEAD").Return("def", nil)
	withFakeRunner(t, fake)

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
	fake.On("ls-files", "--others", "--exclude-standard", "--", "README.md").Return("", nil)
	withFakeRunner(t, fake)

	if err := StageHunk(dir, "README.md", 0); err == nil {
		t.Fatal("expected out-of-range error")
	}
}
