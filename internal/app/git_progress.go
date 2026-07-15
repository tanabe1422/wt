package app

import (
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const gitProgressEvent = "git:progress"

// Cap Wails→React progress updates so Receiving objects: N% does not flood the UI.
const gitProgressMinInterval = 100 * time.Millisecond

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

	a.progressMu.Lock()
	now := time.Now()
	skip := message == a.lastProgressMsg || now.Sub(a.lastProgressAt) < gitProgressMinInterval
	if !skip {
		a.lastProgressMsg = message
		a.lastProgressAt = now
	}
	a.progressMu.Unlock()
	if skip {
		return
	}

	runtime.EventsEmit(a.ctx, gitProgressEvent, GitProgressPayload{Message: message})
}
