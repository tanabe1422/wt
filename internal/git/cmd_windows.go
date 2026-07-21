//go:build windows

package git

import (
	"os/exec"
	"syscall"
)

// HideWindow only: CREATE_NO_WINDOW allocates a hidden conhost per git.exe and
// makes frequent fetch/status launches slower on Windows.
func configureCmd(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
}
