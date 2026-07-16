package git

import (
	"testing"
)

func TestParseNameStatusZ(t *testing.T) {
	raw := "M\x00README.md\x00A\x00src/new.go\x00R100\x00old.txt\x00new.txt\x00"
	changes := parseNameStatusZ(raw)
	if len(changes) != 3 {
		t.Fatalf("expected 3 changes, got %d: %+v", len(changes), changes)
	}
	if changes[0].Status != "M" || changes[0].Path != "README.md" {
		t.Fatalf("unexpected first change: %+v", changes[0])
	}
	if changes[1].Status != "A" || changes[1].Path != "src/new.go" {
		t.Fatalf("unexpected second change: %+v", changes[1])
	}
	if changes[2].Status != "R" || changes[2].Path != "new.txt" || changes[2].OldPath != "old.txt" {
		t.Fatalf("unexpected rename change: %+v", changes[2])
	}
}

func TestParseNameStatusZEmpty(t *testing.T) {
	changes := parseNameStatusZ("")
	if len(changes) != 0 {
		t.Fatalf("expected empty, got %+v", changes)
	}
}

func TestListCommitFilesAndDiff(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("rev-list", "--parents", "-n", "1", "rootsha").Once().Return("rootsha", nil)
	fake.On("diff-tree", "--no-commit-id", "--name-status", "-r", "-z", "--root", "rootsha").Once().
		Return("A\x00a.txt\x00", nil)
	fake.On("rev-list", "--parents", "-n", "1", "secondsha").Once().Return("secondsha rootsha", nil)
	fake.On("diff-tree", "--no-commit-id", "--name-status", "-r", "-z", "secondsha").Once().
		Return("M\x00a.txt\x00A\x00b.txt\x00", nil)
	fake.On("rev-list", "--parents", "-n", "1", "secondsha").Once().Return("secondsha rootsha", nil)
	fake.On("show", "-U3", "--format=", "secondsha", "--", "a.txt").Return(
		"diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n",
		nil,
	)
	withFakeRunner(t, fake)

	rootFiles, err := ListCommitFiles(dir, "rootsha")
	if err != nil {
		t.Fatalf("ListCommitFiles root: %v", err)
	}
	if len(rootFiles) != 1 || rootFiles[0].Path != "a.txt" || rootFiles[0].Status != "A" {
		t.Fatalf("unexpected root files: %+v", rootFiles)
	}

	files, err := ListCommitFiles(dir, "secondsha")
	if err != nil {
		t.Fatalf("ListCommitFiles second: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %+v", files)
	}
	byPath := map[string]CommitFileChange{}
	for _, f := range files {
		byPath[f.Path] = f
	}
	if byPath["a.txt"].Status != "M" {
		t.Fatalf("expected a.txt modified, got %+v", byPath["a.txt"])
	}
	if byPath["b.txt"].Status != "A" {
		t.Fatalf("expected b.txt added, got %+v", byPath["b.txt"])
	}

	diff, err := GetCommitFileDiff(dir, "secondsha", "a.txt")
	if err != nil {
		t.Fatalf("GetCommitFileDiff: %v", err)
	}
	if diff.Path != "a.txt" {
		t.Fatalf("unexpected path: %s", diff.Path)
	}
	foundAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && line.Content == "line2" {
				foundAdd = true
			}
		}
	}
	if !foundAdd {
		t.Fatalf("expected added line2 in diff: %+v", diff)
	}
}

func TestListCommitFilesAndDiffMergeFirstParent(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	mergeSHA := "mergesha"
	fake.On("rev-list", "--parents", "-n", "1", mergeSHA).Once().
		Return(mergeSHA+" parent1 parent2", nil)
	fake.On("diff", "--name-status", "-z", mergeSHA+"^", mergeSHA).Once().
		Return("M\x00feature.go\x00A\x00new.txt\x00", nil)
	fake.On("rev-list", "--parents", "-n", "1", mergeSHA).Once().
		Return(mergeSHA+" parent1 parent2", nil)
	fake.On("diff", "-U3", mergeSHA+"^", mergeSHA, "--", "feature.go").Once().Return(
		"diff --git a/feature.go b/feature.go\n--- a/feature.go\n+++ b/feature.go\n@@ -1,1 +1,2 @@\n pkg\n+func F() {}\n",
		nil,
	)
	withFakeRunner(t, fake)

	files, err := ListCommitFiles(dir, mergeSHA)
	if err != nil {
		t.Fatalf("ListCommitFiles merge: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files from first-parent diff, got %+v", files)
	}
	if files[0].Path != "feature.go" || files[0].Status != "M" {
		t.Fatalf("unexpected first file: %+v", files[0])
	}
	if files[1].Path != "new.txt" || files[1].Status != "A" {
		t.Fatalf("unexpected second file: %+v", files[1])
	}

	diff, err := GetCommitFileDiff(dir, mergeSHA, "feature.go")
	if err != nil {
		t.Fatalf("GetCommitFileDiff merge: %v", err)
	}
	if diff.Path != "feature.go" {
		t.Fatalf("unexpected path: %s", diff.Path)
	}
	foundAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && line.Content == "func F() {}" {
				foundAdd = true
			}
		}
	}
	if !foundAdd {
		t.Fatalf("expected added func line in merge first-parent diff: %+v", diff)
	}

	fake.AssertNotCalledPrefix(t, "show")
	fake.AssertNotCalledPrefix(t, "diff-tree")
}

func TestGetCommitFileDiffEmptyArgs(t *testing.T) {
	_, err := GetCommitFileDiff(".", "", "a.txt")
	if err == nil {
		t.Fatal("expected error for empty sha")
	}
	_, err = GetCommitFileDiff(".", "abc", "")
	if err == nil {
		t.Fatal("expected error for empty file")
	}
}

func TestListRangeFilesAndDiff(t *testing.T) {
	dir := t.TempDir()
	fake := newFakeRunner()
	fake.On("diff", "--name-status", "-z", "main", "feature").Once().
		Return("M\x00a.txt\x00A\x00b.txt\x00", nil)
	fake.On("diff", "-U3", "main", "feature", "--", "a.txt").Once().Return(
		"diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,2 @@\n line1\n+line2\n",
		nil,
	)
	withFakeRunner(t, fake)

	files, err := ListRangeFiles(dir, "main", "feature")
	if err != nil {
		t.Fatalf("ListRangeFiles: %v", err)
	}
	if len(files) != 2 {
		t.Fatalf("expected 2 files, got %+v", files)
	}
	if files[0].Path != "a.txt" || files[0].Status != "M" {
		t.Fatalf("unexpected first file: %+v", files[0])
	}
	if files[1].Path != "b.txt" || files[1].Status != "A" {
		t.Fatalf("unexpected second file: %+v", files[1])
	}

	diff, err := GetRangeFileDiff(dir, "main", "feature", "a.txt")
	if err != nil {
		t.Fatalf("GetRangeFileDiff: %v", err)
	}
	if diff.Path != "a.txt" {
		t.Fatalf("unexpected path: %s", diff.Path)
	}
	foundAdd := false
	for _, hunk := range diff.Hunks {
		for _, line := range hunk.Lines {
			if line.Kind == "add" && line.Content == "line2" {
				foundAdd = true
			}
		}
	}
	if !foundAdd {
		t.Fatalf("expected added line2 in diff: %+v", diff)
	}
}

func TestListRangeFilesEmptyArgs(t *testing.T) {
	_, err := ListRangeFiles(".", "", "feature")
	if err == nil {
		t.Fatal("expected error for empty fromRef")
	}
	_, err = ListRangeFiles(".", "main", "")
	if err == nil {
		t.Fatal("expected error for empty toRef")
	}
	_, err = GetRangeFileDiff(".", "main", "feature", "")
	if err == nil {
		t.Fatal("expected error for empty file")
	}
}
