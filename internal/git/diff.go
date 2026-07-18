package git

import (
	"bytes"
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

	// Untracked: index に無くディスク上にあるファイルは CLI なしで全文追加 diff を組み立てる。
	// （旧実装は git diff → ls-files → diff --no-index の 3 spawn）
	if !staged {
		if ut, err := nativeIsUntracked(dir, file); err == nil && ut {
			return untrackedFileDiff(dir, file)
		}
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

	return parseUnifiedDiff(file, out), nil
}

// untrackedFileDiff builds an all-additions FileDiff from the working tree file
// (same idea as `git diff --no-index -- /dev/null <file>`).
func untrackedFileDiff(dir, file string) (FileDiff, error) {
	rel := filepath.ToSlash(filepath.Clean(file))
	rel = strings.TrimPrefix(rel, "./")
	abs := filepath.Join(dir, filepath.FromSlash(rel))
	data, err := os.ReadFile(abs)
	if err != nil {
		return FileDiff{}, err
	}
	if isBinaryContent(data) {
		return FileDiff{}, errors.New("バイナリファイルの diff は表示できません")
	}

	lines := splitFileLines(string(data))
	if len(lines) == 0 {
		return FileDiff{Path: file, Hunks: []DiffHunk{}}, nil
	}

	hunkLines := make([]DiffLine, 0, len(lines))
	for i, line := range lines {
		hunkLines = append(hunkLines, DiffLine{
			Kind:    "add",
			Content: line,
			NewNo:   i + 1,
		})
	}
	return FileDiff{
		Path: file,
		Hunks: []DiffHunk{{
			Header: formatHunkHeader(0, 0, 1, len(hunkLines), ""),
			Lines:  hunkLines,
		}},
	}, nil
}

func splitFileLines(content string) []string {
	if content == "" {
		return nil
	}
	lines := strings.Split(content, "\n")
	if lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return lines
}

func isBinaryContent(data []byte) bool {
	return bytes.IndexByte(data, 0) >= 0
}

// GetCommitFileDiff returns a parsed unified diff for a file in a commit.
// Merge commits use a first-parent diff (sha^..sha), matching OpenCommitDifftool.
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

	parentCount, err := commitParentCount(dir, sha)
	if err != nil {
		return FileDiff{}, err
	}

	var out string
	if parentCount >= 2 {
		out, err = runGitAllowDiffExit(
			dir,
			"diff",
			"-U"+strconv.Itoa(diffContextLines),
			sha+"^",
			sha,
			"--",
			file,
		)
	} else {
		args := []string{
			"show",
			"-U" + strconv.Itoa(diffContextLines),
			"--format=",
			sha,
			"--",
			file,
		}
		out, err = runGit(dir, args...)
	}
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

// PartialHunk builds a hunk containing only the selected add/del lines.
// Unselected additions are omitted; unselected deletions become context.
// selected holds 0-based indices into hunk.Lines.
func PartialHunk(hunk DiffHunk, selected []int) (DiffHunk, error) {
	if len(selected) == 0 {
		return DiffHunk{}, errors.New("選択行が空です")
	}

	selectedSet := make(map[int]struct{}, len(selected))
	for _, idx := range selected {
		if idx < 0 || idx >= len(hunk.Lines) {
			return DiffHunk{}, errors.New("行インデックスが範囲外です")
		}
		kind := hunk.Lines[idx].Kind
		if kind != "add" && kind != "del" {
			return DiffHunk{}, errors.New("コンテキスト行は選択できません")
		}
		selectedSet[idx] = struct{}{}
	}

	lines := make([]DiffLine, 0, len(hunk.Lines))
	oldCount, newCount := 0, 0
	hasChange := false
	for i, line := range hunk.Lines {
		switch line.Kind {
		case "ctx":
			lines = append(lines, line)
			oldCount++
			newCount++
		case "add":
			if _, ok := selectedSet[i]; ok {
				lines = append(lines, line)
				newCount++
				hasChange = true
			}
		case "del":
			if _, ok := selectedSet[i]; ok {
				lines = append(lines, line)
				oldCount++
				hasChange = true
			} else {
				lines = append(lines, DiffLine{
					Kind:    "ctx",
					Content: line.Content,
					OldNo:   line.OldNo,
					NewNo:   line.OldNo,
				})
				oldCount++
				newCount++
			}
		default:
			lines = append(lines, line)
		}
	}
	if !hasChange {
		return DiffHunk{}, errors.New("適用する変更行がありません")
	}

	oldStart, newStart, suffix := parseHunkHeaderParts(hunk.Header)
	header := formatHunkHeader(oldStart, oldCount, newStart, newCount, suffix)
	return DiffHunk{Header: header, Lines: lines}, nil
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

// parseHunkHeaderParts extracts 1-based start line numbers and trailing suffix
// from a header like "@@ -1,3 +1,4 @@ optional".
func parseHunkHeaderParts(header string) (oldStart, newStart int, suffix string) {
	oldStart, newStart = 1, 1
	parts := strings.Fields(header)
	for _, part := range parts {
		if strings.HasPrefix(part, "-") && len(part) > 1 && part[1] >= '0' && part[1] <= '9' {
			oldStart = parseRangeStart(part[1:])
		}
		if strings.HasPrefix(part, "+") && len(part) > 1 && part[1] >= '0' && part[1] <= '9' {
			newStart = parseRangeStart(part[1:])
		}
	}
	if idx := strings.LastIndex(header, "@@"); idx >= 0 {
		rest := strings.TrimSpace(header[idx+2:])
		if rest != "" {
			suffix = rest
		}
	}
	return oldStart, newStart, suffix
}

func formatHunkHeader(oldStart, oldCount, newStart, newCount int, suffix string) string {
	header := "@@ -" + formatRange(oldStart, oldCount) + " +" + formatRange(newStart, newCount) + " @@"
	if suffix != "" {
		header += " " + suffix
	}
	return header
}

func formatRange(start, count int) string {
	if count == 1 {
		return strconv.Itoa(start)
	}
	return strconv.Itoa(start) + "," + strconv.Itoa(count)
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
