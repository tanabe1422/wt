package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// initHotpathRepo creates a small real repo for go-git hotpath tests.
// Uses system git for fixture setup only; the code under test uses go-git.
func initHotpathRepo(t *testing.T) string {
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

	run("init", "-b", "main")
	run("config", "user.email", "test@example.com")
	run("config", "user.name", "Test User")
	run("config", "commit.gpgsign", "false")

	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "commit 1")

	// Simulate origin/main at the same tip, then diverge local main by 1 commit.
	run("remote", "add", "origin", dir)
	run("update-ref", "refs/remotes/origin/main", "HEAD")
	run("branch", "--set-upstream-to=origin/main", "main")

	if err := os.WriteFile(filepath.Join(dir, "a.txt"), []byte("2\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "a.txt")
	run("commit", "-m", "commit 2 ahead")

	run("checkout", "-b", "feature")
	if err := os.WriteFile(filepath.Join(dir, "b.txt"), []byte("f\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "b.txt")
	run("commit", "-m", "feature commit")
	run("tag", "v-light")
	run("tag", "-a", "v-annotated", "-m", "annotated")
	run("checkout", "main")
	return dir
}

func TestNativeListBranchesMeta(t *testing.T) {
	dir := initHotpathRepo(t)

	entries, err := listBranchesMeta(dir)
	if err != nil {
		t.Fatalf("listBranchesMeta: %v", err)
	}

	local := map[string]BranchEntry{}
	var remotes []string
	for _, e := range entries {
		if e.IsRemote {
			remotes = append(remotes, e.Name)
			continue
		}
		local[e.Name] = e
	}

	main, ok := local["main"]
	if !ok || !main.IsCurrent || !main.HasUpstream {
		t.Fatalf("unexpected main: %+v (locals=%v)", main, local)
	}
	feature, ok := local["feature"]
	if !ok || feature.IsCurrent || feature.HasUpstream {
		t.Fatalf("unexpected feature: %+v", feature)
	}

	foundOriginMain := false
	for _, r := range remotes {
		if r == "origin/main" {
			foundOriginMain = true
		}
		if strings.HasSuffix(r, "/HEAD") {
			t.Fatalf("remote HEAD should be skipped: %s", r)
		}
	}
	if !foundOriginMain {
		t.Fatalf("expected origin/main in remotes, got %v", remotes)
	}
}

func TestNativeCountAheadBehind(t *testing.T) {
	dir := initHotpathRepo(t)

	got, err := GetBranchAheadBehind(dir, "main")
	if err != nil {
		t.Fatalf("GetBranchAheadBehind: %v", err)
	}
	if got.Ahead != 1 || got.Behind != 0 {
		t.Fatalf("want ahead=1 behind=0, got %+v", got)
	}
}

func TestNativeCurrentBranch(t *testing.T) {
	dir := initHotpathRepo(t)

	branch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatalf("CurrentBranch: %v", err)
	}
	if branch != "main" {
		t.Fatalf("want main, got %q", branch)
	}
}

func TestNativeListBranchHeads(t *testing.T) {
	dir := initHotpathRepo(t)

	heads, err := ListBranchHeads(dir)
	if err != nil {
		t.Fatalf("ListBranchHeads: %v", err)
	}
	names := map[string]string{}
	for _, h := range heads {
		names[h.Name] = h.Commit.SHA
	}
	if names["feature"] == "" {
		t.Fatalf("expected feature head, got %#v", names)
	}
	if names["v-light"] == "" || names["v-light"] != names["feature"] {
		t.Fatalf("lightweight tag should point at feature tip: %#v", names)
	}
	if names["v-annotated"] == "" || names["v-annotated"] != names["feature"] {
		t.Fatalf("annotated tag should peel to feature tip: %#v", names)
	}
	if _, ok := names["origin/HEAD"]; ok {
		t.Fatal("origin/HEAD should be skipped")
	}
}

func TestNativeResolveRepo(t *testing.T) {
	dir := initHotpathRepo(t)
	sub := filepath.Join(dir, "nested")
	if err := os.MkdirAll(sub, 0o755); err != nil {
		t.Fatal(err)
	}

	info, err := ResolveRepo(sub)
	if err != nil {
		t.Fatalf("ResolveRepo: %v", err)
	}
	if !info.IsRepo {
		t.Fatal("expected IsRepo")
	}
	want, _ := filepath.EvalSymlinks(dir)
	got, _ := filepath.EvalSymlinks(info.RepoRoot)
	if filepath.Clean(got) != filepath.Clean(want) {
		t.Fatalf("RepoRoot=%q want %q", info.RepoRoot, dir)
	}

	info, err = ResolveRepo(t.TempDir())
	if err != nil {
		t.Fatalf("ResolveRepo non-repo: %v", err)
	}
	if info.IsRepo {
		t.Fatal("expected non-repo")
	}
}

func TestNativeListBranchesFillsCurrentTrack(t *testing.T) {
	dir := initHotpathRepo(t)

	entries, err := ListBranches(dir)
	if err != nil {
		t.Fatalf("ListBranches: %v", err)
	}
	for _, e := range entries {
		if e.Name == "main" && e.IsCurrent {
			if e.AheadCount != 1 || e.BehindCount != 0 {
				t.Fatalf("main track: %+v", e)
			}
			return
		}
	}
	t.Fatal("main current branch not found")
}

func TestGetFileDiffUntrackedNoCLI(t *testing.T) {
	dir := initHotpathRepo(t)
	path := "new-untracked.txt"
	content := "alpha\nbeta\n"
	if err := os.WriteFile(filepath.Join(dir, path), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	fake := newFakeRunner()
	withFakeRunner(t, fake)

	diff, err := GetFileDiff(dir, path, false)
	if err != nil {
		t.Fatalf("GetFileDiff: %v", err)
	}
	if len(fake.Calls()) != 0 {
		t.Fatalf("expected no git CLI for untracked diff, got %v", fake.ArgsList())
	}
	if len(diff.Hunks) != 1 {
		t.Fatalf("hunks=%d want 1", len(diff.Hunks))
	}
	if diff.Hunks[0].Header != "@@ -0,0 +1,2 @@" {
		t.Fatalf("header=%q", diff.Hunks[0].Header)
	}
	kinds := lineKinds(diff.Hunks[0])
	if !equalStrings(kinds, []string{"add", "add"}) {
		t.Fatalf("kinds=%v", kinds)
	}
	if diff.Hunks[0].Lines[0].Content != "alpha" || diff.Hunks[0].Lines[1].Content != "beta" {
		t.Fatalf("lines=%+v", diff.Hunks[0].Lines)
	}
}

func TestGetFileDiffUntrackedBinary(t *testing.T) {
	dir := initHotpathRepo(t)
	path := "bin.dat"
	if err := os.WriteFile(filepath.Join(dir, path), []byte{0x00, 0x01, 0x02}, 0o644); err != nil {
		t.Fatal(err)
	}

	_, err := GetFileDiff(dir, path, false)
	if err == nil || !strings.Contains(err.Error(), "バイナリ") {
		t.Fatalf("expected binary error, got %v", err)
	}
}

func TestNativeIsUntracked(t *testing.T) {
	dir := initHotpathRepo(t)
	ut, err := nativeIsUntracked(dir, "a.txt")
	if err != nil {
		t.Fatal(err)
	}
	if ut {
		t.Fatal("tracked a.txt must not be untracked")
	}

	if err := os.WriteFile(filepath.Join(dir, "only-wt.txt"), []byte("x\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	ut, err = nativeIsUntracked(dir, "only-wt.txt")
	if err != nil {
		t.Fatal(err)
	}
	if !ut {
		t.Fatal("only-wt.txt should be untracked")
	}
}

func TestNativeUpstreamAndAhead(t *testing.T) {
	dir := initHotpathRepo(t)

	ref, err := nativeUpstreamShortName(dir)
	if err != nil {
		t.Fatalf("nativeUpstreamShortName: %v", err)
	}
	if ref != "origin/main" {
		t.Fatalf("upstream=%q want origin/main", ref)
	}

	ahead, has, err := nativeAheadOfUpstream(dir)
	if err != nil {
		t.Fatalf("nativeAheadOfUpstream: %v", err)
	}
	if !has || ahead != 1 {
		t.Fatalf("ahead=%d has=%v want ahead=1", ahead, has)
	}

	msg, err := nativeHeadCommitMessage(dir)
	if err != nil {
		t.Fatalf("nativeHeadCommitMessage: %v", err)
	}
	if !strings.Contains(msg, "ahead") {
		t.Fatalf("message=%q", msg)
	}
}
