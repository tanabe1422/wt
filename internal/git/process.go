package git

import (
	"context"
	"sync"
	"time"
)

// Timeouts prevent hung network git (fetch/pull/push) from living forever.
// Regular Run has no deadline so mergetool/difftool can wait on external editors;
// those still die when the app process context is cancelled.
const (
	gitProgressTimeout = 30 * time.Minute
	gitWaitDelay       = 3 * time.Second
)

var (
	processMu  sync.RWMutex
	processCtx = context.Background()
)

// SetProcessContext binds in-flight git commands to an app lifecycle context.
// When ctx is cancelled (e.g. Wails Shutdown), CommandContext kills those processes.
func SetProcessContext(ctx context.Context) {
	processMu.Lock()
	defer processMu.Unlock()
	if ctx == nil {
		processCtx = context.Background()
		return
	}
	processCtx = ctx
}

func cmdContext() context.Context {
	processMu.RLock()
	defer processMu.RUnlock()
	return processCtx
}
