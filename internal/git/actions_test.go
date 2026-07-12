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

func TestDiscardFilesIntegration(t *testing.T) {
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

	modified := string(original) + "\n# discard files line\n"
	if err := os.WriteFile(readme, []byte(modified), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DiscardFiles(repo, []string{"README.md"}); err != nil {
		t.Fatalf("DiscardFiles: %v", err)
	}

	after, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != string(original) {
		t.Fatalf("expected file reverted after DiscardFiles")
	}
}

func TestDeleteUntrackedIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	testName := fmt.Sprintf("delete-untracked-%d.txt", time.Now().UnixNano())
	testFile := filepath.Join(repo, testName)
	if err := os.WriteFile(testFile, []byte("temp\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(testFile) })

	if err := DeleteUntracked(repo, []string{testName}); err != nil {
		t.Fatalf("DeleteUntracked: %v", err)
	}
	if _, err := os.Stat(testFile); !os.IsNotExist(err) {
		t.Fatalf("expected untracked file removed, stat err=%v", err)
	}
}

func TestDiscardAllChangesIntegration(t *testing.T) {
	repo := sampleRepoPath(t)
	readme := filepath.Join(repo, "README.md")
	original, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	untrackedName := fmt.Sprintf("discard-all-%d.txt", time.Now().UnixNano())
	untrackedFile := filepath.Join(repo, untrackedName)
	t.Cleanup(func() {
		cmd := exec.Command("git", "reset", "--hard")
		cmd.Dir = repo
		_ = cmd.Run()
		_ = os.WriteFile(readme, original, 0o644)
		_ = os.Remove(untrackedFile)
	})

	if err := os.WriteFile(readme, append(original, []byte("\n# discard all\n")...), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(untrackedFile, []byte("temp\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("git", "add", "README.md")
	cmd.Dir = repo
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git add: %v\n%s", err, out)
	}

	if err := DiscardAllChanges(repo); err != nil {
		t.Fatalf("DiscardAllChanges: %v", err)
	}

	after, err := os.ReadFile(readme)
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != string(original) {
		t.Fatalf("expected tracked file reverted after DiscardAllChanges")
	}
	if _, err := os.Stat(untrackedFile); !os.IsNotExist(err) {
		t.Fatalf("expected untracked file removed, stat err=%v", err)
	}
}

func TestAbortMergeIntegration(t *testing.T) {
	dir := initBranchOpRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	merging, err := IsMerging(dir)
	if err != nil {
		t.Fatalf("IsMerging before: %v", err)
	}
	if merging {
		t.Fatal("expected not merging initially")
	}

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("main conflict\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "main conflict")

	run("checkout", "feature")
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("feature conflict\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "feature conflict")
	run("checkout", defaultBranch)

	cmd := exec.Command("git", "merge", "--no-commit", "feature")
	cmd.Dir = dir
	_ = cmd.Run() // expect conflict

	merging, err = IsMerging(dir)
	if err != nil {
		t.Fatalf("IsMerging during: %v", err)
	}
	if !merging {
		t.Fatal("expected merge in progress")
	}

	if err := AbortMerge(dir); err != nil {
		t.Fatalf("AbortMerge: %v", err)
	}

	merging, err = IsMerging(dir)
	if err != nil {
		t.Fatalf("IsMerging after abort: %v", err)
	}
	if merging {
		t.Fatal("expected merge aborted")
	}
}

func TestGetAmendInfoNoUpstream(t *testing.T) {
	dir := initBranchOpRepo(t)
	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if !info.CanAmend {
		t.Fatalf("expected canAmend, reason=%q", info.Reason)
	}
	if info.HeadMessage == "" {
		t.Fatal("expected head message")
	}
}

func TestGetAmendInfoBlocksWhenSyncedWithUpstream(t *testing.T) {
	dir := initBranchOpRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	sha, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	run("remote", "add", "origin", dir)
	run("update-ref", "refs/remotes/origin/"+defaultBranch, sha)
	run("branch", "--set-upstream-to=origin/"+defaultBranch, defaultBranch)

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if info.CanAmend {
		t.Fatal("expected amend blocked when ahead=0")
	}
	if info.Reason != "すでにプッシュ済みです" {
		t.Fatalf("unexpected reason: %q", info.Reason)
	}
}

func TestAmendCommitAllowsWhenAhead(t *testing.T) {
	dir := initBranchOpRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	baseSHA, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	run("remote", "add", "origin", dir)
	run("update-ref", "refs/remotes/origin/"+defaultBranch, baseSHA)
	run("branch", "--set-upstream-to=origin/"+defaultBranch, defaultBranch)

	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("local ahead\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "local tip")

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if !info.CanAmend {
		t.Fatalf("expected canAmend when ahead>=1, reason=%q", info.Reason)
	}

	before := gitHead(t, dir)
	if err := AmendCommit(dir, "amended tip"); err != nil {
		t.Fatalf("AmendCommit: %v", err)
	}
	after := gitHead(t, dir)
	if before == after {
		t.Fatal("HEAD sha should change after amend")
	}
	msg, err := runGit(dir, "log", "-1", "--format=%B")
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(msg) != "amended tip" {
		t.Fatalf("message=%q", msg)
	}
}

func TestAmendCommitRejectsWhenSynced(t *testing.T) {
	dir := initBranchOpRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	sha, err := runGit(dir, "rev-parse", "HEAD")
	if err != nil {
		t.Fatal(err)
	}
	run("remote", "add", "origin", dir)
	run("update-ref", "refs/remotes/origin/"+defaultBranch, sha)
	run("branch", "--set-upstream-to=origin/"+defaultBranch, defaultBranch)

	if err := AmendCommit(dir, "should fail"); err == nil {
		t.Fatal("expected AmendCommit to fail when ahead=0")
	}
}

func TestGetAmendInfoBlocksWhileMerging(t *testing.T) {
	dir := initBranchOpRepo(t)
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}

	defaultBranch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("main conflict\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "main conflict")
	run("checkout", "feature")
	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("feature conflict\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "feature conflict")
	run("checkout", defaultBranch)

	cmd := exec.Command("git", "merge", "--no-commit", "feature")
	cmd.Dir = dir
	_ = cmd.Run()

	info, err := GetAmendInfo(dir)
	if err != nil {
		t.Fatalf("GetAmendInfo: %v", err)
	}
	if info.CanAmend {
		t.Fatal("expected amend blocked while merging")
	}
	if info.Reason != "マージ中は修正できません" {
		t.Fatalf("unexpected reason: %q", info.Reason)
	}
}
