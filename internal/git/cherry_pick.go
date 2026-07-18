package git

import (
	"errors"
	"path/filepath"
	"strings"
)

// IsCherryPicking reports whether a cherry-pick is in progress in the worktree.
func IsCherryPicking(worktreePath string) (bool, error) {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return false, err
	}
	ok, err := nativeHasGitFile(dir, "CHERRY_PICK_HEAD")
	if err != nil || !ok {
		return false, nil
	}
	return true, nil
}

func cherryPickPrecheck(dir string) error {
	rebasing, err := IsRebasing(dir)
	if err != nil {
		return err
	}
	if rebasing {
		return errors.New("リベース中は cherry-pick できません")
	}
	picking, err := IsCherryPicking(dir)
	if err != nil {
		return err
	}
	if picking {
		return errors.New("cherry-pick 中は新しい cherry-pick を開始できません")
	}
	merging, err := IsMerging(dir)
	if err != nil {
		return err
	}
	if merging {
		return errors.New("マージ中は cherry-pick できません")
	}
	onBranch, err := nativeIsOnBranch(dir)
	if err != nil || !onBranch {
		return errors.New("ブランチにチェックアウトしてから cherry-pick してください")
	}
	dirty, err := hasWorkingTreeChanges(dir)
	if err != nil {
		return err
	}
	if dirty {
		return errors.New("未コミットの変更があります。コミットするかスタッシュしてから cherry-pick してください。")
	}
	return nil
}

// CherryPick applies a single commit onto the current branch.
func CherryPick(worktreePath, sha string) error {
	sha = strings.TrimSpace(sha)
	if sha == "" {
		return errors.New("コミットが空です")
	}
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	if err := cherryPickPrecheck(dir); err != nil {
		return err
	}
	_, err = runGit(dir, "cherry-pick", sha)
	return err
}

// ContinueCherryPick continues an in-progress cherry-pick after conflicts are resolved.
func ContinueCherryPick(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "cherry-pick", "--continue")
	return err
}

// AbortCherryPick aborts an in-progress cherry-pick.
func AbortCherryPick(worktreePath string) error {
	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}
	_, err = runGit(dir, "cherry-pick", "--abort")
	return err
}
