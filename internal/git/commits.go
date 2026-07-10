package git

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

const (
	HistoryScopeAll    = "all"
	HistoryScopeBranch = "branch"
	defaultCommitLimit = 50
)

// CommitParent references a parent commit SHA.
type CommitParent struct {
	SHA string `json:"sha"`
}

// CommitAuthor describes commit authorship metadata.
type CommitAuthor struct {
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
	Date  string `json:"date"`
}

// CommitDetails holds commit message and author info.
type CommitDetails struct {
	Author  CommitAuthor `json:"author"`
	Message string       `json:"message"`
}

// CommitLogEntry matches the commit-graph Commit type shape.
type CommitLogEntry struct {
	SHA     string         `json:"sha"`
	Commit  CommitDetails  `json:"commit"`
	Parents []CommitParent `json:"parents"`
}

// BranchHeadCommit identifies the tip commit of a branch.
type BranchHeadCommit struct {
	SHA string `json:"sha"`
}

// BranchHead matches the commit-graph Branch type shape.
type BranchHead struct {
	Name   string           `json:"name"`
	Commit BranchHeadCommit `json:"commit"`
}

// ListCommitsParams configures paginated commit log retrieval.
type ListCommitsParams struct {
	WorktreePath string
	Scope        string
	Branch       string
	Skip         int
	Limit        int
}

// ListCommitsResult is a page of commit log entries.
type ListCommitsResult struct {
	Commits  []CommitLogEntry `json:"commits"`
	HasMore  bool             `json:"hasMore"`
	NextSkip int              `json:"nextSkip"`
}

const commitLogFormat = "%H%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%B%x1e"

// ListCommits returns a paginated commit log for the given worktree.
func ListCommits(params ListCommitsParams) (ListCommitsResult, error) {
	dir := params.WorktreePath
	if dir == "" {
		return ListCommitsResult{}, errors.New("ワークツリーが指定されていません")
	}

	scope := params.Scope
	if scope == "" {
		scope = HistoryScopeAll
	}
	if scope != HistoryScopeAll && scope != HistoryScopeBranch {
		return ListCommitsResult{}, fmt.Errorf("不明な scope: %s", scope)
	}

	skip := params.Skip
	if skip < 0 {
		skip = 0
	}

	limit := params.Limit
	if limit <= 0 {
		limit = defaultCommitLimit
	}

	args := []string{
		"log",
		"--topo-order",
		fmt.Sprintf("--format=%s", commitLogFormat),
		fmt.Sprintf("--skip=%d", skip),
		"-n", strconv.Itoa(limit + 1),
	}
	if scope == HistoryScopeAll {
		args = append([]string{"log", "--all"}, args[1:]...)
	} else {
		branch := params.Branch
		if branch == "" {
			var err error
			branch, err = CurrentBranch(dir)
			if err != nil {
				return ListCommitsResult{}, err
			}
		}
		args = append(args, branch)
	}

	out, err := runGit(dir, args...)
	if err != nil {
		return ListCommitsResult{}, err
	}

	entries := parseCommitLog(out)
	hasMore := len(entries) > limit
	if hasMore {
		entries = entries[:limit]
	}

	return ListCommitsResult{
		Commits:  entries,
		HasMore:  hasMore,
		NextSkip: skip + len(entries),
	}, nil
}

// ListBranchHeads returns branch tips and tags for commit labels.
func ListBranchHeads(worktreePath string) ([]BranchHead, error) {
	if worktreePath == "" {
		return nil, errors.New("ワークツリーが指定されていません")
	}

	out, err := runGit(
		worktreePath,
		"for-each-ref",
		"--format=%(refname:short)|%(objecttype)|%(objectname)",
		"refs/heads/",
		"refs/remotes/",
		"refs/tags/",
	)
	if err != nil {
		return nil, err
	}

	heads := make([]BranchHead, 0)
	if out == "" {
		return heads, nil
	}

	for _, line := range strings.Split(out, "\n") {
		parts := strings.SplitN(line, "|", 3)
		name := strings.TrimSpace(parts[0])
		if name == "" || strings.HasSuffix(name, "/HEAD") {
			continue
		}
		objectType := ""
		objectName := ""
		if len(parts) > 1 {
			objectType = strings.TrimSpace(parts[1])
		}
		if len(parts) > 2 {
			objectName = strings.TrimSpace(parts[2])
		}
		if objectName == "" {
			continue
		}

		sha := objectName
		if objectType == "tag" {
			resolved, err := runGit(worktreePath, "rev-parse", name+"^{commit}")
			if err != nil {
				continue
			}
			sha = strings.TrimSpace(resolved)
			if sha == "" {
				continue
			}
		}

		heads = append(heads, BranchHead{
			Name: name,
			Commit: BranchHeadCommit{
				SHA: sha,
			},
		})
	}

	return heads, nil
}

// CurrentBranch returns the short name of the checked-out branch, or HEAD when detached.
func CurrentBranch(dir string) (string, error) {
	name, err := runGit(dir, "rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", err
	}
	return name, nil
}

func parseCommitLog(out string) []CommitLogEntry {
	if strings.TrimSpace(out) == "" {
		return []CommitLogEntry{}
	}

	records := strings.Split(out, "\x1e")
	entries := make([]CommitLogEntry, 0, len(records))

	for _, record := range records {
		record = strings.TrimSuffix(record, "\n")
		if strings.TrimSpace(record) == "" {
			continue
		}

		parts := strings.SplitN(record, "\x1f", 6)
		if len(parts) < 6 {
			continue
		}

		sha := strings.TrimSpace(parts[0])
		if sha == "" {
			continue
		}

		parents := parseParents(parts[1])
		message := strings.TrimRight(parts[5], "\n")

		entries = append(entries, CommitLogEntry{
			SHA: sha,
			Commit: CommitDetails{
				Author: CommitAuthor{
					Name:  parts[2],
					Email: parts[3],
					Date:  parts[4],
				},
				Message: message,
			},
			Parents: parents,
		})
	}

	return entries
}

func parseParents(raw string) []CommitParent {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []CommitParent{}
	}

	shas := strings.Fields(raw)
	parents := make([]CommitParent, 0, len(shas))
	for _, sha := range shas {
		parents = append(parents, CommitParent{SHA: sha})
	}
	return parents
}
