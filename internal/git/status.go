package git

import (
	"path/filepath"
	"strings"
)

// FileStatus describes the git status of a single file.
type FileStatus struct {
	Path        string `json:"path"`
	Index       string `json:"index"`
	WorkTree    string `json:"workTree"`
	Staged      bool   `json:"staged"`
	IsDirectory bool   `json:"isDirectory"`
}

// GetStatus returns porcelain status entries for the worktree at worktreePath.
func GetStatus(worktreePath string) ([]FileStatus, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return nil, err
	}

	out, err := runGit(dir, "status", "--porcelain=v1", "-u")
	if err != nil {
		return nil, err
	}

	entries := parsePorcelainStatus(out)
	enrichStatusEntries(dir, entries)
	return entries, nil
}

func parsePorcelainStatus(out string) []FileStatus {
	if strings.TrimSpace(out) == "" {
		return []FileStatus{}
	}

	lines := strings.Split(out, "\n")
	entries := make([]FileStatus, 0, len(lines))
	for _, line := range lines {
		if line == "" {
			continue
		}
		if len(line) < 4 {
			continue
		}

		index := string(line[0])
		workTree := string(line[1])
		path := strings.TrimSpace(line[3:])

		// Renamed: "R  old -> new" — keep the destination path.
		if arrow := strings.Index(path, " -> "); arrow >= 0 {
			path = path[arrow+4:]
		}
		isDirectory := strings.HasSuffix(path, "/")
		path = strings.TrimRight(path, "/")

		staged := index != " " && index != "?"
		entries = append(entries, FileStatus{
			Path:        path,
			Index:       index,
			WorkTree:    workTree,
			Staged:      staged,
			IsDirectory: isDirectory,
		})
	}

	return entries
}

func enrichStatusEntries(dir string, entries []FileStatus) {
	for i := range entries {
		if entries[i].IsDirectory {
			continue
		}
		if isStagedGitlink(dir, entries[i].Path) {
			entries[i].IsDirectory = true
		}
	}
}

func isStagedGitlink(dir, path string) bool {
	out, err := runGit(dir, "ls-files", "-s", "--", path)
	if err != nil || strings.TrimSpace(out) == "" {
		return false
	}
	line := strings.SplitN(out, "\n", 2)[0]
	return strings.HasPrefix(line, "160000 ")
}

// IsConflict reports whether the entry is an unmerged (conflict) path.
func IsConflict(entry FileStatus) bool {
	if entry.Index == "U" || entry.WorkTree == "U" {
		return true
	}
	// Both added / both deleted during merge.
	if entry.Index == "A" && entry.WorkTree == "A" {
		return true
	}
	if entry.Index == "D" && entry.WorkTree == "D" {
		return true
	}
	return false
}

// HasStagedChange reports whether the entry has index changes.
// Conflict entries are excluded so they appear only under "変更".
func HasStagedChange(entry FileStatus) bool {
	if IsConflict(entry) {
		return false
	}
	return entry.Index != " " && entry.Index != "?"
}

// HasUnstagedChange reports whether the entry has worktree changes.
// Conflict entries are treated as unstaged so they appear once under "変更".
func HasUnstagedChange(entry FileStatus) bool {
	if IsConflict(entry) {
		return true
	}
	if entry.Index == "?" && entry.WorkTree == "?" {
		return true
	}
	return entry.WorkTree != " "
}
