package git

import (
	"errors"
	"fmt"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
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
	LastAuthor   string `json:"lastAuthor"`   // author of tip commit
}

type remoteRefInfo struct {
	Name         string
	LastCommitAt string
	LastAuthor   string
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

	candidates := make([]remoteRefInfo, 0, len(remotes))
	for _, ref := range remotes {
		if ref.Name == baseRef {
			continue
		}
		candidates = append(candidates, ref)
	}

	var mergedByName map[string]bool
	if checkMode == MergeCheckAncestry {
		mergedSet, err := ancestryMergedRemotes(dir, baseRef)
		if err != nil {
			return nil, err
		}
		mergedByName = make(map[string]bool, len(candidates))
		for _, ref := range candidates {
			_, mergedByName[ref.Name] = mergedSet[ref.Name]
		}
	} else {
		mergedByName, err = contentMergedRemotes(dir, baseRef, candidates)
		if err != nil {
			return nil, err
		}
	}

	entries := make([]RemoteMergeEntry, 0, len(candidates))
	for _, ref := range candidates {
		entries = append(entries, RemoteMergeEntry{
			Name:         ref.Name,
			Merged:       mergedByName[ref.Name],
			LastCommitAt: ref.LastCommitAt,
			LastAuthor:   ref.LastAuthor,
		})
	}
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].LastCommitAt != entries[j].LastCommitAt {
			return entries[i].LastCommitAt < entries[j].LastCommitAt
		}
		return entries[i].Name < entries[j].Name
	})
	return entries, nil
}

// contentMergedRemotes marks candidates merged when their tip content is already in base.
// Ancestry-merged refs skip merge-tree; the rest are checked in parallel.
func contentMergedRemotes(dir, baseRef string, candidates []remoteRefInfo) (map[string]bool, error) {
	result := make(map[string]bool, len(candidates))
	if len(candidates) == 0 {
		return result, nil
	}

	ancestrySet, err := ancestryMergedRemotes(dir, baseRef)
	if err != nil {
		return nil, err
	}

	needCheck := make([]remoteRefInfo, 0, len(candidates))
	for _, ref := range candidates {
		if _, ok := ancestrySet[ref.Name]; ok {
			result[ref.Name] = true
			continue
		}
		needCheck = append(needCheck, ref)
	}
	if len(needCheck) == 0 {
		return result, nil
	}

	baseTree, err := runGit(dir, "rev-parse", baseRef+"^{tree}")
	if err != nil {
		return nil, err
	}
	baseTree = strings.TrimSpace(baseTree)

	workers := runtime.NumCPU()
	if workers < 2 {
		workers = 2
	}
	if workers > 8 {
		workers = 8
	}
	if workers > len(needCheck) {
		workers = len(needCheck)
	}

	type checkResult struct {
		name   string
		merged bool
	}
	jobs := make(chan remoteRefInfo, len(needCheck))
	out := make(chan checkResult, len(needCheck))

	var wg sync.WaitGroup
	wg.Add(workers)
	for range workers {
		go func() {
			defer wg.Done()
			for ref := range jobs {
				merged, _ := isContentMerged(dir, baseRef, ref.Name, baseTree)
				out <- checkResult{name: ref.Name, merged: merged}
			}
		}()
	}

	for _, ref := range needCheck {
		jobs <- ref
	}
	close(jobs)

	go func() {
		wg.Wait()
		close(out)
	}()

	for item := range out {
		result[item.name] = item.merged
	}
	return result, nil
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
	out, err := runGit(dir, "for-each-ref", "--format=%(refname:short)|%(committerdate:iso8601-strict)|%(authorname)", "refs/remotes/")
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
		parts := strings.SplitN(line, "|", 3)
		name := strings.TrimSpace(parts[0])
		if name == "" || strings.HasSuffix(name, "/HEAD") {
			continue
		}
		date := ""
		author := ""
		if len(parts) > 1 {
			date = strings.TrimSpace(parts[1])
		}
		if len(parts) > 2 {
			author = strings.TrimSpace(parts[2])
		}
		refs = append(refs, remoteRefInfo{
			Name:         name,
			LastCommitAt: date,
			LastAuthor:   author,
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
