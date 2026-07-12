package git

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// DiffLine is a single line inside a diff hunk.
type DiffLine struct {
	Kind    string `json:"kind"`
	Content string `json:"content"`
	OldNo   int    `json:"oldNo,omitempty"`
	NewNo   int    `json:"newNo,omitempty"`
}

// DiffHunk is a contiguous block of diff lines.
type DiffHunk struct {
	Header string     `json:"header"`
	Lines  []DiffLine `json:"lines"`
}

// FileDiff is the parsed unified diff for one file.
type FileDiff struct {
	Path  string     `json:"path"`
	Hunks []DiffHunk `json:"hunks"`
}

const diffContextLines = 3

// GetFileDiff returns a parsed unified diff for the given file.
func GetFileDiff(worktreePath, file string, staged bool) (FileDiff, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return FileDiff{}, err
	}
	if strings.TrimSpace(file) == "" {
		return FileDiff{}, errors.New("ファイルパスが空です")
	}

	args := []string{"diff", "-U" + strconv.Itoa(diffContextLines)}
	if staged {
		args = append(args, "--cached")
	}
	args = append(args, "--", file)

	out, err := runGit(dir, args...)
	if err != nil {
		return FileDiff{}, err
	}

	if strings.Contains(out, "Binary files") {
		return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
	}

	if strings.TrimSpace(out) == "" && !staged && isUntracked(dir, file) {
		noIndexArgs := []string{
			"diff", "--no-index", "-U" + strconv.Itoa(diffContextLines),
			"--", os.DevNull, file,
		}
		out, err = runGitAllowDiffExit(dir, noIndexArgs...)
		if err != nil {
			return FileDiff{}, err
		}
		if strings.Contains(out, "Binary files") {
			return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
		}
	}

	return parseUnifiedDiff(file, out), nil
}

// GetCommitFileDiff returns a parsed unified diff for a file in a commit.
func GetCommitFileDiff(worktreePath, sha, file string) (FileDiff, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return FileDiff{}, err
	}
	sha = strings.TrimSpace(sha)
	if sha == "" {
		return FileDiff{}, errors.New("コミット SHA が空です")
	}
	if strings.TrimSpace(file) == "" {
		return FileDiff{}, errors.New("ファイルパスが空です")
	}

	args := []string{
		"show",
		"-U" + strconv.Itoa(diffContextLines),
		"--format=",
		sha,
		"--",
		file,
	}
	out, err := runGit(dir, args...)
	if err != nil {
		return FileDiff{}, err
	}

	if strings.Contains(out, "Binary files") {
		return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
	}

	return parseUnifiedDiff(file, out), nil
}

// GetRangeFileDiff returns a parsed unified diff for a file between two refs.
func GetRangeFileDiff(worktreePath, fromRef, toRef, file string) (FileDiff, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return FileDiff{}, err
	}
	fromRef = strings.TrimSpace(fromRef)
	toRef = strings.TrimSpace(toRef)
	if fromRef == "" || toRef == "" {
		return FileDiff{}, errors.New("比較対象の ref が空です")
	}
	if strings.TrimSpace(file) == "" {
		return FileDiff{}, errors.New("ファイルパスが空です")
	}

	args := []string{
		"diff",
		"-U" + strconv.Itoa(diffContextLines),
		fromRef,
		toRef,
		"--",
		file,
	}
	out, err := runGitAllowDiffExit(dir, args...)
	if err != nil {
		return FileDiff{}, err
	}

	if strings.Contains(out, "Binary files") {
		return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
	}

	return parseUnifiedDiff(file, out), nil
}

func isUntracked(dir, file string) bool {
	out, err := runGit(dir, "ls-files", "--others", "--exclude-standard", "--", file)
	if err != nil {
		return false
	}
	return strings.TrimSpace(out) != ""
}

func parseUnifiedDiff(path, out string) FileDiff {
	result := FileDiff{Path: path, Hunks: []DiffHunk{}}
	if strings.TrimSpace(out) == "" {
		return result
	}

	lines := strings.Split(out, "\n")
	var current *DiffHunk
	oldNo := 0
	newNo := 0

	for _, line := range lines {
		if strings.HasPrefix(line, "@@") {
			if current != nil && len(current.Lines) > 0 {
				result.Hunks = append(result.Hunks, *current)
			}
			current = &DiffHunk{Header: line, Lines: []DiffLine{}}
			oldNo, newNo = parseHunkRange(line)
			continue
		}

		if current == nil {
			continue
		}

		if line == "" {
			current.Lines = append(current.Lines, DiffLine{Kind: "ctx", Content: ""})
			continue
		}

		prefix := line[0]
		content := ""
		if len(line) > 1 {
			content = line[1:]
		}

		switch prefix {
		case '+':
			newNo++
			current.Lines = append(current.Lines, DiffLine{
				Kind:    "add",
				Content: content,
				NewNo:   newNo,
			})
		case '-':
			oldNo++
			current.Lines = append(current.Lines, DiffLine{
				Kind:    "del",
				Content: content,
				OldNo:   oldNo,
			})
		case ' ':
			oldNo++
			newNo++
			current.Lines = append(current.Lines, DiffLine{
				Kind:    "ctx",
				Content: content,
				OldNo:   oldNo,
				NewNo:   newNo,
			})
		case '\\':
			current.Lines = append(current.Lines, DiffLine{
				Kind:    "ctx",
				Content: line,
			})
		}
	}

	if current != nil && len(current.Lines) > 0 {
		result.Hunks = append(result.Hunks, *current)
	}

	return result
}

func parseHunkRange(header string) (oldStart, newStart int) {
	// @@ -1,3 +1,4 @@
	parts := strings.Fields(header)
	for _, part := range parts {
		if strings.HasPrefix(part, "-") {
			oldStart = parseRangeStart(part[1:])
		}
		if strings.HasPrefix(part, "+") {
			newStart = parseRangeStart(part[1:])
		}
	}
	if oldStart > 0 {
		oldStart--
	}
	if newStart > 0 {
		newStart--
	}
	return oldStart, newStart
}

// HunkToPatch reconstructs a unified diff patch for a single hunk.
func HunkToPatch(path string, hunk DiffHunk) string {
	var b strings.Builder
	b.WriteString("--- a/" + path + "\n")
	b.WriteString("+++ b/" + path + "\n")
	b.WriteString(hunk.Header + "\n")
	for _, line := range hunk.Lines {
		switch line.Kind {
		case "add":
			b.WriteString("+" + line.Content + "\n")
		case "del":
			b.WriteString("-" + line.Content + "\n")
		case "ctx":
			if strings.HasPrefix(line.Content, `\`) {
				b.WriteString(line.Content + "\n")
			} else {
				b.WriteString(" " + line.Content + "\n")
			}
		}
	}
	return b.String()
}

func parseRangeStart(spec string) int {
	if spec == "" {
		return 0
	}
	comma := strings.Index(spec, ",")
	if comma < 0 {
		n, _ := strconv.Atoi(spec)
		return n
	}
	n, _ := strconv.Atoi(spec[:comma])
	return n
}
