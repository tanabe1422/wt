package app

import (
	"context"
	"sync"
	"time"
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
	// Kick active-repo git reads so they overlap with frontend boot.
	go a.warmActiveRepo()
}

func (a *App) Shutdown(ctx context.Context) {}

// Ping is a connectivity check for the Wails bridge.
func (a *App) Ping() string {
	return "pong"
}
