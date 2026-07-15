package app

import (
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const gitProgressEvent = "git:progress"

// GitProgressPayload is sent to the frontend during fetch/pull/push.
type GitProgressPayload struct {
	Message string `json:"message"`
}

func (a *App) emitGitProgress(message string) {
	if a.ctx == nil {
		return
	}
	message = strings.TrimSpace(message)
	if message == "" {
		return
	}
	runtime.EventsEmit(a.ctx, gitProgressEvent, GitProgressPayload{Message: message})
}
