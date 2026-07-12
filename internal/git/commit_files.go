package git

import (
	"errors"
	"strings"
)

// CommitFileChange describes a file changed in a commit.
type CommitFileChange struct {
	Path    string `json:"path"`
	OldPath string `json:"oldPath,omitempty"`
	Status  string `json:"status"`
}

// ListCommitFiles returns the files changed by the given commit.
func ListCommitFiles(worktreePath, sha string) ([]CommitFileChange, error) {
	if worktreePath == "" {
		return nil, errors.New("ワークツリーが指定されていません")
	}
	sha = strings.TrimSpace(sha)
	if sha == "" {
		return nil, errors.New("コミット SHA が空です")
	}

	parentCount, err := commitParentCount(worktreePath, sha)
	if err != nil {
		return nil, err
	}

	args := []string{"diff-tree", "--no-commit-id", "--name-status", "-r", "-z"}
	if parentCount == 0 {
		args = append(args, "--root")
	}
	args = append(args, sha)

	out, err := runGit(worktreePath, args...)
	if err != nil {
		return nil, err
	}

	return parseNameStatusZ(out), nil
}

// ListRangeFiles returns files that differ between two refs (two-dot diff).
func ListRangeFiles(worktreePath, fromRef, toRef string) ([]CommitFileChange, error) {
	if worktreePath == "" {
		return nil, errors.New("ワークツリーが指定されていません")
	}
	fromRef = strings.TrimSpace(fromRef)
	toRef = strings.TrimSpace(toRef)
	if fromRef == "" || toRef == "" {
		return nil, errors.New("比較対象の ref が空です")
	}

	args := []string{"diff", "--name-status", "-z", fromRef, toRef}
	out, err := runGitAllowDiffExit(worktreePath, args...)
	if err != nil {
		return nil, err
	}

	return parseNameStatusZ(out), nil
}

func commitParentCount(worktreePath, sha string) (int, error) {
	out, err := runGit(worktreePath, "rev-list", "--parents", "-n", "1", sha)
	if err != nil {
		return 0, err
	}
	fields := strings.Fields(out)
	if len(fields) == 0 {
		return 0, errors.New("コミットが見つかりません")
	}
	return len(fields) - 1, nil
}

func parseNameStatusZ(out string) []CommitFileChange {
	if out == "" {
		return []CommitFileChange{}
	}

	parts := strings.Split(out, "\x00")
	changes := make([]CommitFileChange, 0)
	i := 0
	for i < len(parts) {
		statusRaw := strings.TrimSpace(parts[i])
		if statusRaw == "" {
			i++
			continue
		}
		status := statusLetter(statusRaw)
		i++

		if i >= len(parts) {
			break
		}

		if isRenameOrCopy(status) {
			oldPath := parts[i]
			i++
			if i >= len(parts) {
				break
			}
			newPath := parts[i]
			i++
			if newPath == "" {
				continue
			}
			changes = append(changes, CommitFileChange{
				Path:    newPath,
				OldPath: oldPath,
				Status:  status,
			})
			continue
		}

		path := parts[i]
		i++
		if path == "" {
			continue
		}
		changes = append(changes, CommitFileChange{
			Path:   path,
			Status: status,
		})
	}

	return changes
}

func statusLetter(raw string) string {
	if raw == "" {
		return ""
	}
	return string(raw[0])
}

func isRenameOrCopy(status string) bool {
	return status == "R" || status == "C"
}
