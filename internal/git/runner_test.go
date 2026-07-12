package git

import (
	"errors"
	"strings"
	"sync"
	"testing"
)

type fakeCall struct {
	Dir         string
	Stdin       string
	ExtraOKExit int
	Args        []string
}

type fakeHandler struct {
	prefix []string
	stdout string
	stderr string
	err    error
	times  int // 0 = unlimited
	used   int
}

// fakeRunner records git invocations and returns scripted responses.
type fakeRunner struct {
	mu       sync.Mutex
	calls    []fakeCall
	handlers []fakeHandler
}

func newFakeRunner() *fakeRunner {
	return &fakeRunner{}
}

type fakeExpect struct {
	runner *fakeRunner
	prefix []string
	times  int
}

func (f *fakeRunner) On(args ...string) *fakeExpect {
	return &fakeExpect{runner: f, prefix: append([]string(nil), args...), times: 0}
}

func (e *fakeExpect) Once() *fakeExpect {
	e.times = 1
	return e
}

func (e *fakeExpect) Return(stdout string, err error) *fakeRunner {
	e.runner.mu.Lock()
	defer e.runner.mu.Unlock()
	e.runner.handlers = append(e.runner.handlers, fakeHandler{
		prefix: e.prefix,
		stdout: stdout,
		err:    err,
		times:  e.times,
	})
	return e.runner
}

func (e *fakeExpect) ReturnFull(stdout, stderr string, err error) *fakeRunner {
	e.runner.mu.Lock()
	defer e.runner.mu.Unlock()
	e.runner.handlers = append(e.runner.handlers, fakeHandler{
		prefix: e.prefix,
		stdout: stdout,
		stderr: stderr,
		err:    err,
		times:  e.times,
	})
	return e.runner
}

func (f *fakeRunner) Run(dir, stdin string, extraOKExit int, args ...string) (string, string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.calls = append(f.calls, fakeCall{
		Dir:         dir,
		Stdin:       stdin,
		ExtraOKExit: extraOKExit,
		Args:        append([]string(nil), args...),
	})

	for i := range f.handlers {
		h := &f.handlers[i]
		if h.times > 0 && h.used >= h.times {
			continue
		}
		if !argsHasPrefix(args, h.prefix) {
			continue
		}
		h.used++
		return h.stdout, h.stderr, h.err
	}

	return "", "", errors.New("unexpected git " + strings.Join(args, " "))
}

func argsHasPrefix(args, prefix []string) bool {
	if len(args) < len(prefix) {
		return false
	}
	for i := range prefix {
		if args[i] != prefix[i] {
			return false
		}
	}
	return true
}

func (f *fakeRunner) Calls() []fakeCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]fakeCall, len(f.calls))
	copy(out, f.calls)
	return out
}

func (f *fakeRunner) ArgsList() [][]string {
	calls := f.Calls()
	out := make([][]string, len(calls))
	for i, call := range calls {
		out[i] = append([]string(nil), call.Args...)
	}
	return out
}

func (f *fakeRunner) AssertCalled(t *testing.T, want ...string) {
	t.Helper()
	for _, call := range f.Calls() {
		if argsEqual(call.Args, want) {
			return
		}
	}
	t.Fatalf("expected git call %v, got %v", want, f.ArgsList())
}

func (f *fakeRunner) AssertCalledPrefix(t *testing.T, want ...string) {
	t.Helper()
	for _, call := range f.Calls() {
		if argsHasPrefix(call.Args, want) {
			return
		}
	}
	t.Fatalf("expected git call prefix %v, got %v", want, f.ArgsList())
}

func (f *fakeRunner) AssertNotCalledPrefix(t *testing.T, want ...string) {
	t.Helper()
	for _, call := range f.Calls() {
		if argsHasPrefix(call.Args, want) {
			t.Fatalf("did not expect git call prefix %v, got %v", want, f.ArgsList())
		}
	}
}

func argsEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func withFakeRunner(t *testing.T, fake *fakeRunner) {
	t.Helper()
	prev := defaultRunner
	defaultRunner = fake
	t.Cleanup(func() {
		defaultRunner = prev
	})
}

func skipIfShort(t *testing.T) {
	t.Helper()
	if testing.Short() {
		t.Skip("skipping real git integration in -short mode")
	}
}
