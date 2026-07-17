//go:build !windows

package git

import "os/exec"

func setProcessCancel(cmd *exec.Cmd) {
	cmd.Cancel = func() error {
		if cmd.Process == nil {
			return nil
		}
		return cmd.Process.Kill()
	}
	cmd.WaitDelay = gitWaitDelay
}
