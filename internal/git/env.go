package git

import (
	"os"
	"os/exec"
	"strings"
)

// Non-interactive env so Hidden-window GUI git never blocks forever on terminal prompts.
// Do not set GCM_INTERACTIVE=never: Windows users still need GCM's own auth UI.
var nonInteractiveGitEnv = []string{
	"GIT_TERMINAL_PROMPT=0",
	"GIT_ASKPASS=",
}

func applyNonInteractiveEnv(cmd *exec.Cmd) {
	applyEnvOverrides(cmd, nonInteractiveGitEnv)
	applyEnvOverrides(cmd, loggingEnvOverrides())
}

func applyEnvOverrides(cmd *exec.Cmd, overrides []string) {
	if len(overrides) == 0 {
		return
	}
	base := cmd.Env
	if base == nil {
		base = os.Environ()
	}
	out := make([]string, 0, len(base)+len(overrides))
	for _, kv := range base {
		skip := false
		for _, override := range overrides {
			key, _, _ := strings.Cut(override, "=")
			if strings.HasPrefix(kv, key+"=") {
				skip = true
				break
			}
		}
		if !skip {
			out = append(out, kv)
		}
	}
	cmd.Env = append(out, overrides...)
}
