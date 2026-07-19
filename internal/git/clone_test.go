package git

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestCloneArgs(t *testing.T) {
	got := cloneArgs("https://example.com/repo.git", `C:\dev\repo`)
	want := []string{"clone", "--progress", "https://example.com/repo.git", `C:\dev\repo`}
	if len(got) != len(want) {
		t.Fatalf("cloneArgs len: got %v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("cloneArgs[%d]: got %q want %q", i, got[i], want[i])
		}
	}
}

func TestCloneWithProgress(t *testing.T) {
	parent := t.TempDir()
	dest := filepath.Join(parent, "sample-repo")
	url := "https://example.com/sample-repo.git"

	fake := newFakeRunner()
	fake.On("clone", "--progress", url, dest).Return("", nil)
	withFakeRunner(t, fake)

	if err := CloneWithProgress(url, dest, nil); err != nil {
		t.Fatalf("CloneWithProgress: %v", err)
	}
	fake.AssertCalled(t, "clone", "--progress", url, dest)
}

func TestCloneWithProgressDestExists(t *testing.T) {
	parent := t.TempDir()
	dest := filepath.Join(parent, "existing")
	if err := os.Mkdir(dest, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	fake := newFakeRunner()
	withFakeRunner(t, fake)

	err := CloneWithProgress("https://example.com/repo.git", dest, nil)
	if err == nil {
		t.Fatal("expected error when dest exists")
	}
	fake.AssertNotCalledPrefix(t, "clone")
}

func TestCloneWithProgressEmptyURL(t *testing.T) {
	parent := t.TempDir()
	dest := filepath.Join(parent, "repo")

	err := CloneWithProgress("  ", dest, nil)
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
}

func TestCloneWithProgressMissingParent(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "missing-parent", "repo")

	fake := newFakeRunner()
	withFakeRunner(t, fake)

	err := CloneWithProgress("https://example.com/repo.git", dest, nil)
	if err == nil {
		t.Fatal("expected error when parent missing")
	}
	fake.AssertNotCalledPrefix(t, "clone")
}

type partialCloneRunner struct {
	dest string
}

func (r partialCloneRunner) Run(dir, stdin string, extraOKExit int, args ...string) (string, string, error) {
	if err := os.MkdirAll(r.dest, 0o755); err != nil {
		return "", "", err
	}
	return "", "", errors.New("network interrupted")
}

func (r partialCloneRunner) RunProgress(dir string, onLine ProgressFunc, args ...string) (string, string, error) {
	return r.Run(dir, "", 0, args...)
}

func TestCloneWithProgressRemovesPartialDestOnFailure(t *testing.T) {
	parent := t.TempDir()
	dest := filepath.Join(parent, "partial-repo")
	url := "https://example.com/partial-repo.git"

	prev := defaultRunner
	defaultRunner = partialCloneRunner{dest: dest}
	t.Cleanup(func() { defaultRunner = prev })

	err := CloneWithProgress(url, dest, nil)
	if err == nil {
		t.Fatal("expected clone error")
	}
	if _, statErr := os.Stat(dest); !os.IsNotExist(statErr) {
		t.Fatalf("expected partial dest removed, stat=%v", statErr)
	}
}
