//go:build windows

package git

import (
	"os/exec"
	"strconv"
)

// setProcessCancel kills the whole process tree on context cancel.
// Plain Process.Kill leaves git-remote-https / index-pack orphans on Windows.
func setProcessCancel(cmd *exec.Cmd) {
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return nil
		}
		kill := exec.Command("taskkill", "/T", "/F", "/PID", strconv.Itoa(cmd.Process.Pid))
		configureCmd(kill)
		_ = kill.Run()
		return nil
	}
	cmd.WaitDelay = gitWaitDelay
}
