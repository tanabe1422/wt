//go:build !windows

package git

import "os/exec"

func configureCmd(cmd *exec.Cmd) {}
