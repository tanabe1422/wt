package app

import (
	"context"
)

// App exposes methods to the React frontend via Wails bindings.
type App struct {
	ctx context.Context
}

func New() *App {
	return &App{}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) Shutdown(ctx context.Context) {}

// Ping is a connectivity check for the Wails bridge.
func (a *App) Ping() string {
	return "pong"
}
