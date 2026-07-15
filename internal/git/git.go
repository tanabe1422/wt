package git

import (
	"bytes"
	"errors"
	"os/exec"
	"path/filepath"
	"strings"
)

// gitRunner executes git commands. Tests replace defaultRunner with a fake.
type gitRunner interface {
	Run(dir, stdin string, extraOKExit int, args ...string) (stdout, stderr string, err error)
	RunProgress(dir string, onLine ProgressFunc, args ...string) (stdout, stderr string, err error)
}

type realRunner struct{}

func (realRunner) Run(dir, stdin string, extraOKExit int, args ...string) (string, string, error) {
	cmd := exec.Command("git", args...)
	configureCmd(cmd)
	cmd.Dir = dir
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	if err := cmd.Run(); err != nil {
		if extraOKExit > 0 {
			if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == extraOKExit {
				return strings.TrimSuffix(outBuf.String(), "\n"), strings.TrimSuffix(errBuf.String(), "\n"), nil
			}
		}
		msg := strings.TrimSpace(errBuf.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", "", errors.New(msg)
	}
	return strings.TrimSuffix(outBuf.String(), "\n"), strings.TrimSuffix(errBuf.String(), "\n"), nil
}

func (realRunner) RunProgress(dir string, onLine ProgressFunc, args ...string) (string, string, error) {
	cmd := exec.Command("git", args...)
	configureCmd(cmd)
	cmd.Dir = dir

	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return "", "", err
	}

	if err := cmd.Start(); err != nil {
		return "", "", err
	}

	scanErr := scanProgressStream(stderrPipe, &errBuf, onLine)
	waitErr := cmd.Wait()
	if scanErr != nil && waitErr == nil {
		waitErr = scanErr
	}
	if waitErr != nil {
		msg := strings.TrimSpace(errBuf.String())
		if msg == "" {
			msg = waitErr.Error()
		}
		return "", "", errors.New(msg)
	}
	return strings.TrimSuffix(outBuf.String(), "\n"), strings.TrimSuffix(errBuf.String(), "\n"), nil
}

var defaultRunner gitRunner = realRunner{}

func runGitWithStdin(dir, stdin string, args ...string) (string, error) {
	stdout, _, err := defaultRunner.Run(dir, stdin, 0, args...)
	return stdout, err
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
	return defaultRunner.Run(dir, "", 0, args...)
}

// runGitAllowDiffExit runs git diff and treats exit code 1 as success.
// git diff uses exit code 1 when differences are present.
func runGitAllowDiffExit(dir string, args ...string) (string, error) {
	return runGitWithExitOK(dir, 1, args...)
}

func runGitWithExitOK(dir string, extraOKExit int, args ...string) (string, error) {
	stdout, _, err := defaultRunner.Run(dir, "", extraOKExit, args...)
	return stdout, err
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
