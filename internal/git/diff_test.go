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

func TestPartialHunkSelectAddOnly(t *testing.T) {
	hunk := DiffHunk{
		Header: "@@ -1,3 +1,5 @@",
		Lines: []DiffLine{
			{Kind: "ctx", Content: "a"},
			{Kind: "add", Content: "b"},
			{Kind: "add", Content: "c"},
			{Kind: "ctx", Content: "d"},
		},
	}
	// Select only the second add (index 2).
	partial, err := PartialHunk(hunk, []int{2})
	if err != nil {
		t.Fatalf("PartialHunk: %v", err)
	}
	if partial.Header != "@@ -1,2 +1,3 @@" {
		t.Fatalf("header=%q", partial.Header)
	}
	kinds := lineKinds(partial)
	want := []string{"ctx", "add", "ctx"}
	if !equalStrings(kinds, want) {
		t.Fatalf("kinds=%v want %v", kinds, want)
	}
	if partial.Lines[1].Content != "c" {
		t.Fatalf("selected add content=%q", partial.Lines[1].Content)
	}
}

func TestPartialHunkUnselectedDelBecomesContext(t *testing.T) {
	hunk := DiffHunk{
		Header: "@@ -10,4 +10,4 @@ func foo",
		Lines: []DiffLine{
			{Kind: "ctx", Content: "x"},
			{Kind: "del", Content: "old1"},
			{Kind: "del", Content: "old2"},
			{Kind: "add", Content: "new1"},
			{Kind: "add", Content: "new2"},
			{Kind: "ctx", Content: "y"},
		},
	}
	// Select only first del and first add.
	partial, err := PartialHunk(hunk, []int{1, 3})
	if err != nil {
		t.Fatalf("PartialHunk: %v", err)
	}
	if partial.Header != "@@ -10,4 +10,4 @@ func foo" {
		t.Fatalf("header=%q", partial.Header)
	}
	kinds := lineKinds(partial)
	want := []string{"ctx", "del", "ctx", "add", "ctx"}
	if !equalStrings(kinds, want) {
		t.Fatalf("kinds=%v want %v", kinds, want)
	}
	if partial.Lines[2].Kind != "ctx" || partial.Lines[2].Content != "old2" {
		t.Fatalf("unselected del should be ctx: %+v", partial.Lines[2])
	}
}

func TestPartialHunkEmptySelection(t *testing.T) {
	hunk := DiffHunk{
		Header: "@@ -1,1 +1,2 @@",
		Lines: []DiffLine{
			{Kind: "ctx", Content: "a"},
			{Kind: "add", Content: "b"},
		},
	}
	if _, err := PartialHunk(hunk, nil); err == nil {
		t.Fatal("expected empty selection error")
	}
}

func TestPartialHunkRejectsContext(t *testing.T) {
	hunk := DiffHunk{
		Header: "@@ -1,1 +1,2 @@",
		Lines: []DiffLine{
			{Kind: "ctx", Content: "a"},
			{Kind: "add", Content: "b"},
		},
	}
	if _, err := PartialHunk(hunk, []int{0}); err == nil {
		t.Fatal("expected context selection error")
	}
}

func lineKinds(hunk DiffHunk) []string {
	kinds := make([]string, len(hunk.Lines))
	for i, line := range hunk.Lines {
		kinds[i] = line.Kind
	}
	return kinds
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
