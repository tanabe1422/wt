package git

import (
	"strings"
	"testing"
)

func TestParseUnifiedDiff(t *testing.T) {
	raw := `diff --git a/README.md b/README.md
index abc..def 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Sample
 context line
-removed
+added
 context2
`

	diff := parseUnifiedDiff("README.md", raw)
	if diff.Path != "README.md" {
		t.Fatalf("path=%q", diff.Path)
	}
	if len(diff.Hunks) != 1 {
		t.Fatalf("hunks=%d want 1", len(diff.Hunks))
	}

	hunk := diff.Hunks[0]
	if hunk.Header != "@@ -1,3 +1,4 @@" {
		t.Fatalf("header=%q", hunk.Header)
	}

	kinds := make([]string, len(hunk.Lines))
	for i, line := range hunk.Lines {
		kinds[i] = line.Kind
	}
	wantKinds := []string{"ctx", "ctx", "del", "add", "ctx"}
	if len(kinds) < len(wantKinds) {
		t.Fatalf("lines=%d want at least %d", len(kinds), len(wantKinds))
	}
	for i := range wantKinds {
		if kinds[i] != wantKinds[i] {
			t.Fatalf("line %d kind=%q want %q", i, kinds[i], wantKinds[i])
		}
	}

	var delLine, addLine *DiffLine
	for i := range hunk.Lines {
		switch hunk.Lines[i].Kind {
		case "del":
			delLine = &hunk.Lines[i]
		case "add":
			addLine = &hunk.Lines[i]
		}
	}
	if delLine == nil || delLine.Content != "removed" || delLine.OldNo != 3 {
		t.Fatalf("del line: %+v", delLine)
	}
	if addLine == nil || addLine.Content != "added" || addLine.NewNo != 3 {
		t.Fatalf("add line: %+v", addLine)
	}
}

func TestParseUnifiedDiffEmpty(t *testing.T) {
	diff := parseUnifiedDiff("file.go", "")
	if len(diff.Hunks) != 0 {
		t.Fatalf("expected no hunks")
	}
}

func TestParseHunkRange(t *testing.T) {
	oldStart, newStart := parseHunkRange("@@ -10,5 +20,7 @@")
	if oldStart != 9 || newStart != 19 {
		t.Fatalf("oldStart=%d newStart=%d", oldStart, newStart)
	}
}

func TestHunkToPatch(t *testing.T) {
	raw := `diff --git a/README.md b/README.md
index abc..def 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Sample
 context line
-removed
+added
 context2`

	diff := parseUnifiedDiff("README.md", raw)
	if len(diff.Hunks) != 1 {
		t.Fatalf("hunks=%d want 1", len(diff.Hunks))
	}

	patch := HunkToPatch("README.md", diff.Hunks[0])
	want := `--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # Sample
 context line
-removed
+added
 context2
`
	if strings.TrimSuffix(patch, "\n") != strings.TrimSuffix(want, "\n") {
		t.Fatalf("patch mismatch:\n--- got ---\n%s--- want ---\n%s", patch, want)
	}
}
