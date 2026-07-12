package git

import (
	"bytes"
	"errors"
	"os/exec"
	"path/filepath"
	"strings"
)

func runGitWithStdin(dir, stdin string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Stdin = strings.NewReader(stdin)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", errors.New(msg)
	}
	return strings.TrimSuffix(out.String(), "\n"), nil
}

// RepoInfo describes whether a directory is inside a git repository.
type RepoInfo struct {
	IsRepo   bool   `json:"isRepo"`
	RepoRoot string `json:"repoRoot"`
}

func runGit(dir string, args ...string) (string, error) {
	return runGitWithExitOK(dir, 0, args...)
}

// runGitCapture returns stdout and stderr on success.
func runGitCapture(dir string, args ...string) (stdout, stderr string, err error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	if runErr := cmd.Run(); runErr != nil {
		msg := strings.TrimSpace(errBuf.String())
		if msg == "" {
			msg = runErr.Error()
		}
		return "", "", errors.New(msg)
	}
	return strings.TrimSuffix(outBuf.String(), "\n"), strings.TrimSuffix(errBuf.String(), "\n"), nil
}

// runGitAllowDiffExit runs git diff and treats exit code 1 as success.
// git diff uses exit code 1 when differences are present.
func runGitAllowDiffExit(dir string, args ...string) (string, error) {
	return runGitWithExitOK(dir, 1, args...)
}

func runGitWithExitOK(dir string, extraOKExit int, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if extraOKExit > 0 {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == extraOKExit {
				return strings.TrimSuffix(out.String(), "\n"), nil
			}
		}
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", errors.New(msg)
	}
	return strings.TrimSuffix(out.String(), "\n"), nil
}

// ResolveRepo returns repository metadata for the given directory.
func ResolveRepo(directory string) (RepoInfo, error) {
	abs, err := filepath.Abs(filepath.Clean(directory))
	if err != nil {
		return RepoInfo{}, err
	}
	if abs == "" {
		return RepoInfo{IsRepo: false}, nil
	}

	root, err := runGit(abs, "rev-parse", "--show-toplevel")
	if err != nil {
		return RepoInfo{IsRepo: false}, nil
	}
	return RepoInfo{IsRepo: true, RepoRoot: root}, nil
}
