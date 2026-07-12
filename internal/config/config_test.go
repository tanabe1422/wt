package config

import (
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestHasSlashFlag(t *testing.T) {
	tests := []struct {
		args string
		want bool
	}{
		{"", false},
		{"-e -u $LOCAL $REMOTE", false},
		{"/e /u $LOCAL $REMOTE", true},
		{"/u -wl $LOCAL $REMOTE", true},
		{"/E /U $LOCAL $REMOTE", true},
		{"C:/Tools/app.exe $LOCAL", false}, // drive path, not a flag
		{"-/e", false},
		{"/1 invalid", false},
	}
	for _, tc := range tests {
		if got := hasSlashFlag(tc.args); got != tc.want {
			t.Errorf("hasSlashFlag(%q)=%v want %v", tc.args, got, tc.want)
		}
	}
}

func TestNormalizeExternalToolDefaults(t *testing.T) {
	got := normalizeExternalTool(ExternalTool{})
	if got.Preset != "custom" {
		t.Fatalf("empty preset → custom, got %q", got.Preset)
	}

	got = normalizeExternalTool(ExternalTool{
		Preset: "  vscode  ",
		Path:   "  code  ",
		Args:   "  --wait  ",
	})
	if got.Preset != "vscode" || got.Path != "code" || got.Args != "--wait" {
		t.Fatalf("trim failed: %+v", got)
	}
}

func TestNormalizeExternalToolWinMergeSlashFlags(t *testing.T) {
	diff := normalizeExternalTool(ExternalTool{
		Preset: "winmerge",
		Path:   `C:\Program Files\WinMerge\WinMergeU.exe`,
		Args:   `/e /u /wl $LOCAL $REMOTE`,
	})
	if diff.Args != `-e -u -wl "$LOCAL" "$REMOTE"` {
		t.Fatalf("diff args: %q", diff.Args)
	}

	merge := normalizeExternalTool(ExternalTool{
		Preset: "winmerge",
		Path:   `C:\Program Files\WinMerge\WinMergeU.exe`,
		Args:   `/e /u $LOCAL $BASE $REMOTE /o $MERGED`,
	})
	if merge.Args != `-e -u "$LOCAL" "$BASE" "$REMOTE" -o "$MERGED"` {
		t.Fatalf("merge args: %q", merge.Args)
	}
}

func TestNormalizeExternalToolWinMergeKeepsDashFlags(t *testing.T) {
	args := `-e -u -wl "$LOCAL" "$REMOTE"`
	got := normalizeExternalTool(ExternalTool{
		Preset: "winmerge",
		Args:   args,
	})
	if got.Args != args {
		t.Fatalf("dash flags should be kept: got %q", got.Args)
	}
}

func TestNormalizeExternalToolOtherPresetsKeepSlashFlags(t *testing.T) {
	args := `/e /u $LOCAL $REMOTE`
	got := normalizeExternalTool(ExternalTool{
		Preset: "custom",
		Args:   args,
	})
	if got.Args != args {
		t.Fatalf("non-winmerge should keep slash flags: got %q", got.Args)
	}
}

func TestNormalizeSettingsDedupesAndActiveFallback(t *testing.T) {
	dir := t.TempDir()
	repoA := filepath.Join(dir, "a")
	repoB := filepath.Join(dir, "b")

	got, err := normalizeSettings(Settings{
		Repositories:     []string{repoA, repoA, repoB, "", "  "},
		ActiveRepository: filepath.Join(dir, "missing"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Repositories) != 2 {
		t.Fatalf("expected 2 repos after dedupe, got %v", got.Repositories)
	}
	if got.ActiveRepository != got.Repositories[0] {
		t.Fatalf("active should fall back to first repo, got %q want %q", got.ActiveRepository, got.Repositories[0])
	}
}

func TestNormalizeSettingsClearsActiveWhenEmpty(t *testing.T) {
	got, err := normalizeSettings(Settings{
		ActiveRepository: "somewhere",
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.ActiveRepository != "" {
		t.Fatalf("expected empty active, got %q", got.ActiveRepository)
	}
}

func TestNormalizeSettingsKeepsValidActive(t *testing.T) {
	dir := t.TempDir()
	repoA := filepath.Join(dir, "a")
	repoB := filepath.Join(dir, "b")

	got, err := normalizeSettings(Settings{
		Repositories:     []string{repoA, repoB},
		ActiveRepository: repoB,
	})
	if err != nil {
		t.Fatal(err)
	}
	absB, err := filepath.Abs(filepath.Clean(repoB))
	if err != nil {
		t.Fatal(err)
	}
	if got.ActiveRepository != absB {
		t.Fatalf("active=%q want %q", got.ActiveRepository, absB)
	}
}

func TestAddRepository(t *testing.T) {
	dir := t.TempDir()
	repoA := filepath.Join(dir, "a")
	repoB := filepath.Join(dir, "b")

	settings, err := AddRepository(Settings{}, repoA)
	if err != nil {
		t.Fatal(err)
	}
	if len(settings.Repositories) != 1 {
		t.Fatalf("expected 1 repo, got %v", settings.Repositories)
	}

	settings, err = AddRepository(settings, repoB)
	if err != nil {
		t.Fatal(err)
	}
	if len(settings.Repositories) != 2 {
		t.Fatalf("expected 2 repos, got %v", settings.Repositories)
	}
	absB, _ := filepath.Abs(filepath.Clean(repoB))
	if settings.ActiveRepository != absB {
		t.Fatalf("active should be newly added: %q", settings.ActiveRepository)
	}

	// Re-adding existing repo only switches active.
	settings, err = AddRepository(settings, repoA)
	if err != nil {
		t.Fatal(err)
	}
	if len(settings.Repositories) != 2 {
		t.Fatalf("re-add should not duplicate, got %v", settings.Repositories)
	}
	absA, _ := filepath.Abs(filepath.Clean(repoA))
	if settings.ActiveRepository != absA {
		t.Fatalf("active should switch to existing: %q", settings.ActiveRepository)
	}
}

func TestRemoveRepository(t *testing.T) {
	dir := t.TempDir()
	repoA := filepath.Join(dir, "a")
	repoB := filepath.Join(dir, "b")

	settings, err := normalizeSettings(Settings{
		Repositories:     []string{repoA, repoB},
		ActiveRepository: repoA,
	})
	if err != nil {
		t.Fatal(err)
	}

	settings, err = RemoveRepository(settings, repoA)
	if err != nil {
		t.Fatal(err)
	}
	if len(settings.Repositories) != 1 {
		t.Fatalf("expected 1 repo left, got %v", settings.Repositories)
	}
	absB, _ := filepath.Abs(filepath.Clean(repoB))
	if settings.ActiveRepository != absB {
		t.Fatalf("active should fall back to remaining: %q", settings.ActiveRepository)
	}
}

func TestSetActiveRepository(t *testing.T) {
	dir := t.TempDir()
	repoA := filepath.Join(dir, "a")
	repoB := filepath.Join(dir, "b")

	settings, err := normalizeSettings(Settings{
		Repositories:     []string{repoA, repoB},
		ActiveRepository: repoA,
	})
	if err != nil {
		t.Fatal(err)
	}

	settings, err = SetActiveRepository(settings, repoB)
	if err != nil {
		t.Fatal(err)
	}
	absB, _ := filepath.Abs(filepath.Clean(repoB))
	if settings.ActiveRepository != absB {
		t.Fatalf("active=%q want %q", settings.ActiveRepository, absB)
	}

	// Unknown path leaves previous active (normalize keeps it if still in list).
	before := settings.ActiveRepository
	settings, err = SetActiveRepository(settings, filepath.Join(dir, "missing"))
	if err != nil {
		t.Fatal(err)
	}
	if settings.ActiveRepository != before {
		t.Fatalf("unknown path should not change active: got %q", settings.ActiveRepository)
	}
}

func TestNormalizeSettingsNormalizesTools(t *testing.T) {
	got, err := normalizeSettings(Settings{
		DiffTool: ExternalTool{Preset: "winmerge", Args: `/e /u $LOCAL $REMOTE`},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(got.DiffTool.Args, "-e") {
		t.Fatalf("diff tool args should be normalized: %q", got.DiffTool.Args)
	}
	if got.MergeTool.Preset != "custom" {
		t.Fatalf("empty merge tool preset → custom, got %q", got.MergeTool.Preset)
	}
}

func TestNormalizePathEmpty(t *testing.T) {
	for _, path := range []string{"", "  ", "\t"} {
		got, err := normalizePath(path)
		if err != nil {
			t.Fatalf("normalizePath(%q): %v", path, err)
		}
		if got != "" {
			t.Fatalf("normalizePath(%q) should be empty, got %q", path, got)
		}
	}
}

func TestNormalizePathAbs(t *testing.T) {
	dir := t.TempDir()
	got, err := normalizePath(dir)
	if err != nil {
		t.Fatal(err)
	}
	if !filepath.IsAbs(got) {
		t.Fatalf("expected abs path, got %q", got)
	}
	// On Windows, Abs may change casing/volume; Clean+Abs of same input should match.
	want, err := filepath.Abs(filepath.Clean(dir))
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got %q want %q (GOOS=%s)", got, want, runtime.GOOS)
	}
}
