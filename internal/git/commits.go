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

	CommitSearchMessage = "message"
	CommitSearchAuthor  = "author"
	CommitSearchPath    = "path"
	CommitSearchSHA     = "sha"
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
	Name     string           `json:"name"`
	IsRemote bool             `json:"isRemote"`
	IsTag    bool             `json:"isTag"`
	Commit   BranchHeadCommit `json:"commit"`
}

// ListCommitsParams configures paginated commit log retrieval.
type ListCommitsParams struct {
	WorktreePath string
	Scope        string
	Branch       string
	Skip         int
	Limit        int
	SearchType   string // "" | message | author | path | sha
	SearchQuery  string
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

	searchType := strings.TrimSpace(params.SearchType)
	searchQuery := strings.TrimSpace(params.SearchQuery)
	if searchQuery == "" {
		searchType = ""
	}
	if searchType != "" &&
		searchType != CommitSearchMessage &&
		searchType != CommitSearchAuthor &&
		searchType != CommitSearchPath &&
		searchType != CommitSearchSHA {
		return ListCommitsResult{}, fmt.Errorf("不明な searchType: %s", searchType)
	}

	if searchType == CommitSearchSHA {
		return listCommitsBySHA(dir, searchQuery, skip)
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

	switch searchType {
	case CommitSearchMessage:
		args = append(args, "-i", "--grep="+searchQuery)
	case CommitSearchAuthor:
		args = append(args, "--author="+searchQuery)
	case CommitSearchPath:
		args = append(args, "--", pathspecForSearchQuery(searchQuery))
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

func listCommitsBySHA(dir, query string, skip int) (ListCommitsResult, error) {
	if skip > 0 {
		return ListCommitsResult{
			Commits:  []CommitLogEntry{},
			HasMore:  false,
			NextSkip: skip,
		}, nil
	}

	resolved, err := runGit(dir, "rev-parse", "--verify", query+"^{commit}")
	if err != nil {
		return ListCommitsResult{
			Commits:  []CommitLogEntry{},
			HasMore:  false,
			NextSkip: 0,
		}, nil
	}
	resolved = strings.TrimSpace(resolved)
	if resolved == "" {
		return ListCommitsResult{
			Commits:  []CommitLogEntry{},
			HasMore:  false,
			NextSkip: 0,
		}, nil
	}

	out, err := runGit(
		dir,
		"log",
		"-1",
		"--topo-order",
		fmt.Sprintf("--format=%s", commitLogFormat),
		resolved,
	)
	if err != nil {
		return ListCommitsResult{}, err
	}

	entries := parseCommitLog(out)
	return ListCommitsResult{
		Commits:  entries,
		HasMore:  false,
		NextSkip: len(entries),
	}, nil
}

// pathspecForSearchQuery builds a git pathspec from a user search query.
// - "./foo" → root-relative exact path
// - "src/foo" → path prefix
// - "foo.tsx" → filename substring match across all directories
func pathspecForSearchQuery(query string) string {
	if strings.HasPrefix(query, "./") {
		return query
	}
	if strings.Contains(query, "/") {
		return query
	}
	return ":(glob)**/*" + query + "*"
}

// ListBranchHeads returns branch tips and tags for commit labels.
func ListBranchHeads(worktreePath string) ([]BranchHead, error) {
	if worktreePath == "" {
		return nil, errors.New("ワークツリーが指定されていません")
	}
	return nativeListBranchHeads(worktreePath)
}

// CurrentBranch returns the short name of the checked-out branch, or HEAD when detached.
func CurrentBranch(dir string) (string, error) {
	return nativeCurrentBranch(dir)
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
