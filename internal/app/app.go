package app

import (
	"context"
	"sync"
	"time"

	"wt-manager/internal/config"
	"wt-manager/internal/git"
)

// App exposes methods to the React frontend via Wails bindings.
type App struct {
	ctx context.Context

	progressMu      sync.Mutex
	lastProgressMsg string
	lastProgressAt  time.Time
}

func New() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	git.SetProcessContext(ctx)
	if settings, err := config.Load(); err == nil {
		git.SetLoggingEnabled(settings.EnableGitLogging)
	}
	// Kick active-repo git reads so they overlap with frontend boot.
	go a.warmActiveRepo()
}

func (a *App) Shutdown(ctx context.Context) {
	// Startup ctx cancellation already kills in-flight git via CommandContext.
	git.SetProcessContext(context.Background())
}

// Ping is a connectivity check for the Wails bridge.
func (a *App) Ping() string {
	return "pong"
}
