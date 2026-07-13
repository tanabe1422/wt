package git

import (
	"errors"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
)

// MergeCheckMode selects how "merged into base" is determined.
type MergeCheckMode string

const (
	// MergeCheckAncestry uses git ancestry (same idea as `git branch --merged`).
	MergeCheckAncestry MergeCheckMode = "ancestry"
	// MergeCheckContent treats a branch as merged when merging it into base
	// would not change base's tree (covers squash / cherry-pick of all changes).
	MergeCheckContent MergeCheckMode = "content"
)

// RemoteMergeEntry is a remote-tracking branch with merge status relative to a base.
type RemoteMergeEntry struct {
	Name         string `json:"name"`
	Merged       bool   `json:"merged"`
	LastCommitAt string `json:"lastCommitAt"` // ISO-8601 committer date of tip commit
}

type remoteRefInfo struct {
	Name         string
	LastCommitAt string
}

// DefaultRemoteBaseRef resolves the default remote base (usually origin/main).
func DefaultRemoteBaseRef(repoPath string) (string, error) {
	dir, err := absRepoPath(repoPath)
	if err != nil {
		return "", err
	}

	out, err := runGit(dir, "rev-parse", "--abbrev-ref", "refs/remotes/origin/HEAD")
	if err == nil {
		ref := strings.TrimSpace(out)
		if ref != "" && !strings.HasSuffix(ref, "/HEAD") {
			return ref, nil
		}
	}

	remotes, err := listRemoteTrackingRefs(dir)
	if err != nil {
		return "", err
	}
	for _, candidate := range []string{"origin/main", "origin/master"} {
		for _, ref := range remotes {
			if ref.Name == candidate {
				return candidate, nil
			}
		}
	}
	if len(remotes) > 0 {
		return remotes[0].Name, nil
	}
	return "", errors.New("リモートブランチが見つかりません")
}

// ListRemoteMergeStatus lists remote-tracking branches and whether each is merged into baseRef.
func ListRemoteMergeStatus(repoPath, baseRef, mode string) ([]RemoteMergeEntry, error) {
	dir, err := absRepoPath(repoPath)
	if err != nil {
		return nil, err
	}

	baseRef = strings.TrimSpace(baseRef)
	if baseRef == "" {
		return nil, errors.New("基準ブランチが空です")
	}
	if _, err := runGit(dir, "rev-parse", "--verify", baseRef); err != nil {
		return nil, fmt.Errorf("基準ブランチ「%s」を解決できません: %w", baseRef, err)
	}

	checkMode := MergeCheckMode(strings.TrimSpace(mode))
	if checkMode == "" {
		checkMode = MergeCheckAncestry
	}
	if checkMode != MergeCheckAncestry && checkMode != MergeCheckContent {
		return nil, errors.New("無効なマージ判定モードです")
	}

	remotes, err := listRemoteTrackingRefs(dir)
	if err != nil {
		return nil, err
	}

	var mergedSet map[string]struct{}
	var baseTree string
	if checkMode == MergeCheckAncestry {
		mergedSet, err = ancestryMergedRemotes(dir, baseRef)
		if err != nil {
			return nil, err
		}
	} else {
		baseTree, err = runGit(dir, "rev-parse", baseRef+"^{tree}")
		if err != nil {
			return nil, err
		}
		baseTree = strings.TrimSpace(baseTree)
	}

	entries := make([]RemoteMergeEntry, 0, len(remotes))
	for _, ref := range remotes {
		if ref.Name == baseRef {
			continue
		}
		var merged bool
		if checkMode == MergeCheckAncestry {
			_, merged = mergedSet[ref.Name]
		} else {
			merged, err = isContentMerged(dir, baseRef, ref.Name, baseTree)
			if err != nil {
				return nil, err
			}
		}
		entries = append(entries, RemoteMergeEntry{
			Name:         ref.Name,
			Merged:       merged,
			LastCommitAt: ref.LastCommitAt,
		})
	}
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].LastCommitAt != entries[j].LastCommitAt {
			return entries[i].LastCommitAt > entries[j].LastCommitAt
		}
		return entries[i].Name < entries[j].Name
	})
	return entries, nil
}

// DeleteRemoteBranches deletes remote branches via `git push <remote> --delete ...`.
// remoteRefs are remote-tracking names such as "origin/feature/foo".
func DeleteRemoteBranches(worktreePath string, remoteRefs []string) error {
	dir, err := absRepoPath(worktreePath)
	if err != nil {
		return err
	}
	if len(remoteRefs) == 0 {
		return errors.New("削除するブランチがありません")
	}

	byRemote := map[string][]string{}
	for _, ref := range remoteRefs {
		ref = strings.TrimSpace(ref)
		if ref == "" {
			return errors.New("ブランチ名が空です")
		}
		if strings.HasSuffix(ref, "/HEAD") {
			return errors.New("リモート HEAD は削除できません")
		}
		remote, branch, err := splitRemoteRef(ref)
		if err != nil {
			return err
		}
		byRemote[remote] = append(byRemote[remote], branch)
	}

	remotes := make([]string, 0, len(byRemote))
	for remote := range byRemote {
		remotes = append(remotes, remote)
	}
	sort.Strings(remotes)

	for _, remote := range remotes {
		branches := byRemote[remote]
		args := append([]string{"push", remote, "--delete"}, branches...)
		if _, err := runGit(dir, args...); err != nil {
			return err
		}
	}
	return nil
}

func absRepoPath(repoPath string) (string, error) {
	return filepath.Abs(filepath.Clean(repoPath))
}

func listRemoteTrackingRefs(dir string) ([]remoteRefInfo, error) {
	out, err := runGit(dir, "for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)", "refs/remotes/")
	if err != nil {
		return nil, err
	}
	var refs []remoteRefInfo
	if out == "" {
		return refs, nil
	}
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		name, date, _ := strings.Cut(line, "|")
		name = strings.TrimSpace(name)
		if name == "" || strings.HasSuffix(name, "/HEAD") {
			continue
		}
		refs = append(refs, remoteRefInfo{
			Name:         name,
			LastCommitAt: strings.TrimSpace(date),
		})
	}
	sort.SliceStable(refs, func(i, j int) bool {
		return refs[i].Name < refs[j].Name
	})
	return refs, nil
}

func ancestryMergedRemotes(dir, baseRef string) (map[string]struct{}, error) {
	out, err := runGit(dir, "for-each-ref", "--format=%(refname:short)", "--merged="+baseRef, "refs/remotes/")
	if err != nil {
		return nil, err
	}
	set := make(map[string]struct{})
	if out == "" {
		return set, nil
	}
	for _, line := range strings.Split(out, "\n") {
		name := strings.TrimSpace(line)
		if name == "" || strings.HasSuffix(name, "/HEAD") {
			continue
		}
		set[name] = struct{}{}
	}
	return set, nil
}

func isContentMerged(dir, baseRef, candidate, baseTree string) (bool, error) {
	mergedTree, err := runGit(dir, "merge-tree", "--write-tree", baseRef, candidate)
	if err != nil {
		// Conflicts or unresolvable merge → not fully merged.
		return false, nil
	}
	return strings.TrimSpace(mergedTree) == baseTree, nil
}

func splitRemoteRef(remoteRef string) (remote, branch string, err error) {
	parts := strings.SplitN(remoteRef, "/", 2)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", errors.New("無効なリモートブランチ名です")
	}
	return parts[0], parts[1], nil
}
