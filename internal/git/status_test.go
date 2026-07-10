package git

import (
	"testing"
)

func TestParsePorcelainStatus(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []FileStatus
	}{
		{
			name: "empty",
			in:   "",
			want: []FileStatus{},
		},
		{
			name: "unstaged modification",
			in:   " M README.md",
			want: []FileStatus{{
				Path: "README.md", Index: " ", WorkTree: "M", Staged: false,
			}},
		},
		{
			name: "staged modification",
			in:   "M  main.go",
			want: []FileStatus{{
				Path: "main.go", Index: "M", WorkTree: " ", Staged: true,
			}},
		},
		{
			name: "both staged and unstaged",
			in:   "MM config/app.json",
			want: []FileStatus{{
				Path: "config/app.json", Index: "M", WorkTree: "M", Staged: true,
			}},
		},
		{
			name: "untracked",
			in:   "?? new-file.txt",
			want: []FileStatus{{
				Path: "new-file.txt", Index: "?", WorkTree: "?", Staged: false,
			}},
		},
		{
			name: "untracked directory",
			in:   "?? worktrees/main/",
			want: []FileStatus{{
				Path: "worktrees/main", Index: "?", WorkTree: "?", Staged: false, IsDirectory: true,
			}},
		},
		{
			name: "renamed",
			in:   "R  old.txt -> new.txt",
			want: []FileStatus{{
				Path: "new.txt", Index: "R", WorkTree: " ", Staged: true,
			}},
		},
		{
			name: "both modified conflict",
			in:   "UU conflict.go",
			want: []FileStatus{{
				Path: "conflict.go", Index: "U", WorkTree: "U", Staged: true,
			}},
		},
		{
			name: "both added conflict",
			in:   "AA both-added.go",
			want: []FileStatus{{
				Path: "both-added.go", Index: "A", WorkTree: "A", Staged: true,
			}},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := parsePorcelainStatus(tc.in)
			if len(got) != len(tc.want) {
				t.Fatalf("len=%d want %d: %+v", len(got), len(tc.want), got)
			}
			for i := range tc.want {
				if got[i] != tc.want[i] {
					t.Fatalf("entry %d: got %+v want %+v", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestHasStagedAndUnstagedChange(t *testing.T) {
	staged := FileStatus{Path: "a.go", Index: "M", WorkTree: " "}
	if !HasStagedChange(staged) || HasUnstagedChange(staged) {
		t.Fatal("expected staged only")
	}

	unstaged := FileStatus{Path: "b.go", Index: " ", WorkTree: "M"}
	if HasStagedChange(unstaged) || !HasUnstagedChange(unstaged) {
		t.Fatal("expected unstaged only")
	}

	untracked := FileStatus{Path: "c.go", Index: "?", WorkTree: "?"}
	if HasStagedChange(untracked) || !HasUnstagedChange(untracked) {
		t.Fatal("expected untracked as unstaged")
	}

	conflict := FileStatus{Path: "d.go", Index: "U", WorkTree: "U", Staged: true}
	if !IsConflict(conflict) {
		t.Fatal("expected conflict")
	}
	if HasStagedChange(conflict) || !HasUnstagedChange(conflict) {
		t.Fatal("expected conflict only under unstaged")
	}

	bothAdded := FileStatus{Path: "e.go", Index: "A", WorkTree: "A", Staged: true}
	if !IsConflict(bothAdded) || HasStagedChange(bothAdded) || !HasUnstagedChange(bothAdded) {
		t.Fatal("expected AA conflict only under unstaged")
	}
}
