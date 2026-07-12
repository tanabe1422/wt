package git

import (
	"errors"
	"path/filepath"
	"strings"
)

// OpenMergetool launches git mergetool for the given conflicted file using the configured tool.
func OpenMergetool(worktreePath, file, toolPath, toolArgs string) error {
	file = strings.TrimSpace(file)
	if file == "" {
		return errors.New("ファイルパスが空です")
	}

	args, err := openMergetoolArgs(file, toolPath, toolArgs)
	if err != nil {
		return err
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, args...)
	if err != nil {
		// Closing the tool without finishing a resolve makes mergetool exit non-zero.
		// That is normal — keep the conflict and do not surface it as an app error.
		if isUnmergedPath(dir, file) {
			return nil
		}
		return err
	}
	return nil
}

// OpenDifftool launches git difftool for the given file using the configured tool.
func OpenDifftool(worktreePath, file string, staged bool, toolPath, toolArgs string) error {
	file = strings.TrimSpace(file)
	if file == "" {
		return errors.New("ファイルパスが空です")
	}

	args, err := openDifftoolArgs(file, staged, toolPath, toolArgs)
	if err != nil {
		return err
	}

	dir, err := filepath.Abs(filepath.Clean(worktreePath))
	if err != nil {
		return err
	}

	_, err = runGit(dir, args...)
	return err
}

func quoteForGitCmd(path string) string {
	if path == "" {
		return path
	}
	if !strings.ContainsAny(path, " \t\"'\\$`!") {
		return path
	}
	return "'" + strings.ReplaceAll(path, "'", `'\''`) + "'"
}

func buildToolCmd(toolPath, toolArgs string) (string, error) {
	path := strings.TrimSpace(toolPath)
	if path == "" {
		return "", errors.New("外部ツールが設定されていません。設定画面でアプリと開き方を設定してください。")
	}
	cmd := quoteForGitCmd(path)
	args := strings.TrimSpace(toolArgs)
	if args != "" {
		cmd = cmd + " " + args
	}
	return cmd, nil
}

// wrapMergetoolCmd appends a guard so git does not stage the file when conflict
// markers remain (tools often exit 0 even if the user just closed the window).
func wrapMergetoolCmd(toolCmd string) string {
	return toolCmd + `; r=$?; if test -f "$MERGED" && grep -q '^<<<<<<<' "$MERGED" 2>/dev/null; then exit 1; fi; exit $r`
}

func openMergetoolArgs(file, toolPath, toolArgs string) ([]string, error) {
	cmd, err := buildToolCmd(toolPath, toolArgs)
	if err != nil {
		return nil, err
	}
	return []string{
		"-c", "merge.tool=wtmanager",
		"-c", "mergetool.wtmanager.cmd=" + wrapMergetoolCmd(cmd),
		"-c", "mergetool.wtmanager.trustExitCode=true",
		"-c", "mergetool.keepBackup=false",
		"mergetool", "--no-prompt", "--", file,
	}, nil
}

func isUnmergedPath(dir, file string) bool {
	out, err := runGit(dir, "ls-files", "-u", "--", file)
	if err != nil {
		return false
	}
	return strings.TrimSpace(out) != ""
}

func openDifftoolArgs(file string, staged bool, toolPath, toolArgs string) ([]string, error) {
	cmd, err := buildToolCmd(toolPath, toolArgs)
	if err != nil {
		return nil, err
	}
	args := []string{
		"-c", "diff.tool=wtmanager",
		"-c", "difftool.wtmanager.cmd=" + cmd,
		"-c", "difftool.prompt=false",
		"difftool", "--no-prompt",
	}
	if staged {
		args = append(args, "--cached")
	}
	args = append(args, "--", file)
	return args, nil
}
