package app

import (
	"os"
	"path/filepath"
	"testing"

	"wt-manager/internal/config"
)

func TestExpandOpenAppArgs(t *testing.T) {
	tests := []struct {
		template string
		dir      string
		want     []string
	}{
		{"", `C:\wt`, []string{`C:\wt`}},
		{"{path}", `/tmp/wt`, []string{`/tmp/wt`}},
		{"{path}", `/tmp/my wt`, []string{`/tmp/my wt`}},
		{"{path}", `/tmp/evil --flag`, []string{`/tmp/evil --flag`}},
		{"-n {path}", `/tmp/my wt`, []string{"-n", `/tmp/my wt`}},
		{`"{path}"`, `/tmp/my wt`, []string{`/tmp/my wt`}},
		{`-a "foo bar" {path}`, `/x`, []string{"-a", "foo bar", "/x"}},
	}
	for _, tc := range tests {
		got := expandOpenAppArgs(tc.template, tc.dir)
		if len(got) != len(tc.want) {
			t.Fatalf("expand(%q): got %#v want %#v", tc.template, got, tc.want)
		}
		for i := range got {
			if got[i] != tc.want[i] {
				t.Fatalf("expand(%q)[%d]=%q want %q", tc.template, i, got[i], tc.want[i])
			}
		}
	}
}

func TestFindOpenApp(t *testing.T) {
	apps := []config.OpenApp{
		{ID: "a1", Name: "Cursor", Path: "cursor"},
	}
	got, err := findOpenApp(apps, "a1")
	if err != nil || got.Name != "Cursor" {
		t.Fatalf("found: %+v err=%v", got, err)
	}
	if _, err := findOpenApp(apps, "missing"); err == nil {
		t.Fatal("expected missing id error")
	}
	if _, err := findOpenApp(apps, "  "); err == nil {
		t.Fatal("expected empty id error")
	}
}

func TestOpenInAppRejectsNonDirectory(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "file.txt")
	if err := os.WriteFile(filePath, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	err := openInApp(config.OpenApp{Path: "echo", Args: "{path}"}, filePath)
	if err == nil || err.Error() != "not a directory" {
		t.Fatalf("want not a directory, got %v", err)
	}
}

func TestOpenInAppRejectsEmptyPath(t *testing.T) {
	dir := t.TempDir()
	err := openInApp(config.OpenApp{Path: "", Args: "{path}"}, dir)
	if err == nil {
		t.Fatal("expected empty path error")
	}
}

func TestResolveOpenCommand(t *testing.T) {
	exe, args, err := resolveOpenCommand(config.OpenApp{
		Path: "definitely-not-a-real-open-app-bin-xyz",
		Args: "-n {path}",
	}, `/tmp/wt`)
	if err != nil {
		t.Fatal(err)
	}
	if exe != "definitely-not-a-real-open-app-bin-xyz" {
		t.Fatalf("exe=%q", exe)
	}
	if len(args) != 2 || args[0] != "-n" || args[1] != `/tmp/wt` {
		t.Fatalf("args=%#v", args)
	}
}
