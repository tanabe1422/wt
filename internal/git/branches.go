package git

import (
	"errors"
	"fmt"
	"strings"
)

// BranchEntry describes a local or remote branch.
type BranchEntry struct {
	Name        string `json:"name"`
	IsCurrent   bool   `json:"isCurrent"`
	IsRemote    bool   `json:"isRemote"`
	HasUpstream bool   `json:"hasUpstream"`
	AheadCount  int    `json:"aheadCount"`
	BehindCount int    `json:"behindCount"`
}

// parseUpstreamTrack parses git for-each-ref %(upstream:track) values.
// Examples: "[ahead 2]", "[behind 1, ahead 3]", "", "[gone]".
func parseUpstreamTrack(track string) (ahead, behind int) {
	track = strings.TrimSpace(track)
	if track == "" || track == "[gone]" {
		return 0, 0
	}

	inner := strings.TrimPrefix(track, "[")
	inner = strings.TrimSuffix(inner, "]")
	for _, part := range strings.Split(inner, ",") {
		part = strings.TrimSpace(part)
		var n int
		if _, err := fmt.Sscanf(part, "ahead %d", &n); err == nil {
			ahead = n
		}
		if _, err := fmt.Sscanf(part, "behind %d", &n); err == nil {
			behind = n
		}
	}
	return ahead, behind
}

// AheadBehind is the commit divergence of a local branch vs its upstream.
type AheadBehind struct {
	Ahead  int `json:"ahead"`
	Behind int `json:"behind"`
}

// ListBranches returns local and remote branches for the repository at repoPath.
// Ahead/behind is filled only for the current branch (fast path after fetch).
// Use GetBranchAheadBehind for other locals off the critical path.
func ListBranches(repoPath string) ([]BranchEntry, error) {
	entries, err := listBranchesMeta(repoPath)
	if err != nil {
		return nil, err
	}
	fillCurrentBranchTrack(repoPath, entries)
	return entries, nil
}

// listBranchesMeta lists branches without computing upstream ahead/behind.
// Implemented via go-git to avoid git.exe spawn on the sidebar hot path.
func listBranchesMeta(repoPath string) ([]BranchEntry, error) {
	return nativeListBranchesMeta(repoPath)
}

func fillCurrentBranchTrack(repoPath string, entries []BranchEntry) {
	for i := range entries {
		if !entries[i].IsCurrent || !entries[i].HasUpstream {
			continue
		}
		ahead, behind, err := countAheadBehind(repoPath, entries[i].Name)
		if err != nil {
			return
		}
		entries[i].AheadCount = ahead
		entries[i].BehindCount = behind
		return
	}
}

// GetBranchAheadBehind returns ahead/behind for one local branch vs its upstream.
func GetBranchAheadBehind(repoPath, branch string) (AheadBehind, error) {
	branch = strings.TrimSpace(branch)
	if branch == "" {
		return AheadBehind{}, errors.New("ブランチ名が空です")
	}
	ahead, behind, err := countAheadBehind(repoPath, branch)
	if err != nil {
		return AheadBehind{}, err
	}
	return AheadBehind{Ahead: ahead, Behind: behind}, nil
}

// countAheadBehind returns ahead/behind vs upstream (same as
// `git rev-list --left-right --count branch@{upstream}...branch`).
func countAheadBehind(repoPath, branch string) (ahead, behind int, err error) {
	return nativeCountAheadBehind(repoPath, branch)
}

// localBranchFromRemote strips the remote name prefix from a remote ref.
// e.g. "origin/feature/foo" -> "feature/foo".
func localBranchFromRemote(remoteRef string) (string, error) {
	parts := strings.SplitN(remoteRef, "/", 2)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", errors.New("無効なリモートブランチ名です")
	}
	return parts[1], nil
}

// SwitchBranch switches the worktree to a local branch.
func SwitchBranch(worktreePath, branch string) error {
	if strings.TrimSpace(branch) == "" {
		return errors.New("ブランチ名が空です")
	}
	_, err := runGit(worktreePath, "switch", branch)
	return err
}

// CheckoutRemoteBranch creates or switches to a local tracking branch for a remote ref.
func CheckoutRemoteBranch(worktreePath, remoteRef string) error {
	localName, err := localBranchFromRemote(remoteRef)
	if err != nil {
		return err
	}

	_, verifyErr := runGit(worktreePath, "rev-parse", "--verify", "refs/heads/"+localName)
	if verifyErr == nil {
		return SwitchBranch(worktreePath, localName)
	}

	_, err = runGit(worktreePath, "switch", "-c", localName, "--track", remoteRef)
	return err
}

// CreateBranch creates and checks out a new local branch from HEAD.
func CreateBranch(worktreePath, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("ブランチ名が空です")
	}
	_, err := runGit(worktreePath, "switch", "-c", name)
	return err
}

// DeleteBranch deletes a local branch. force uses -D instead of -d.
func DeleteBranch(worktreePath, name string, force bool) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("ブランチ名が空です")
	}

	current, err := CurrentBranch(worktreePath)
	if err != nil {
		return err
	}
	if current == name {
		return errors.New("現在チェックアウト中のブランチは削除できません")
	}

	flag := "-d"
	if force {
		flag = "-D"
	}
	_, err = runGit(worktreePath, "branch", flag, name)
	return err
}

// RenameBranch renames a local branch (git branch -m old new).
func RenameBranch(worktreePath, oldName, newName string) error {
	oldName = strings.TrimSpace(oldName)
	newName = strings.TrimSpace(newName)
	if oldName == "" || newName == "" {
		return errors.New("ブランチ名が空です")
	}
	if oldName == newName {
		return nil
	}
	_, err := runGit(worktreePath, "branch", "-m", oldName, newName)
	return err
}

// MergeBranch merges source into the currently checked-out branch.
func MergeBranch(worktreePath, source string) error {
	source = strings.TrimSpace(source)
	if source == "" {
		return errors.New("ブランチ名が空です")
	}
	_, err := runGit(worktreePath, "merge", "--no-edit", source)
	return err
}

// SquashMergeBranch squash-merges source into the currently checked-out branch
// without creating a commit (changes are left staged).
func SquashMergeBranch(worktreePath, source string) error {
	source = strings.TrimSpace(source)
	if source == "" {
		return errors.New("ブランチ名が空です")
	}
	_, err := runGit(worktreePath, "merge", "--squash", source)
	return err
}

// ResetMode is the git reset mode.
type ResetMode string

const (
	ResetSoft  ResetMode = "soft"
	ResetMixed ResetMode = "mixed"
	ResetHard  ResetMode = "hard"
)

// ResetToCommit resets HEAD to the given commit with the specified mode.
func ResetToCommit(worktreePath, sha string, mode ResetMode) error {
	sha = strings.TrimSpace(sha)
	if sha == "" {
		return errors.New("コミット SHA が空です")
	}

	var flag string
	switch mode {
	case ResetSoft:
		flag = "--soft"
	case ResetMixed:
		flag = "--mixed"
	case ResetHard:
		flag = "--hard"
	default:
		return errors.New("無効なリセットモードです")
	}

	_, err := runGit(worktreePath, "reset", flag, sha)
	return err
}
