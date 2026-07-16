package git

import (
	"errors"
	"testing"
)

func TestGetFsMonitorStateUnset(t *testing.T) {
	fake := newFakeRunner()
	fake.On("config", "--bool", "--get", "core.fsmonitor").Return("", errors.New("exit status 1"))
	withFakeRunner(t, fake)

	state, err := GetFsMonitorState("/repo")
	if err != nil {
		t.Fatalf("GetFsMonitorState: %v", err)
	}
	if state.Enabled {
		t.Fatalf("expected disabled when unset, got %+v", state)
	}
	if state.Supported != FsMonitorSupported() {
		t.Fatalf("supported=%v want %v", state.Supported, FsMonitorSupported())
	}
}

func TestGetFsMonitorStateEnabled(t *testing.T) {
	fake := newFakeRunner()
	fake.On("config", "--bool", "--get", "core.fsmonitor").Return("true", nil)
	withFakeRunner(t, fake)

	state, err := GetFsMonitorState("/repo")
	if err != nil {
		t.Fatalf("GetFsMonitorState: %v", err)
	}
	if !state.Enabled {
		t.Fatalf("expected enabled, got %+v", state)
	}
}

func TestSetFsMonitorEnabledOn(t *testing.T) {
	fake := newFakeRunner()
	fake.On("config", "core.fsmonitor", "true").Return("", nil)
	fake.On("config", "core.untrackedCache", "true").Return("", nil)
	fake.On("fsmonitor--daemon", "start").Return("", nil)
	withFakeRunner(t, fake)

	if err := SetFsMonitorEnabled("/repo", true); err != nil {
		t.Fatalf("SetFsMonitorEnabled: %v", err)
	}
	fake.AssertCalled(t, "config", "core.fsmonitor", "true")
	fake.AssertCalled(t, "config", "core.untrackedCache", "true")
	fake.AssertCalled(t, "fsmonitor--daemon", "start")
}

func TestSetFsMonitorEnabledOff(t *testing.T) {
	fake := newFakeRunner()
	fake.On("config", "core.fsmonitor", "false").Return("", nil)
	fake.On("config", "core.untrackedCache", "false").Return("", nil)
	fake.On("fsmonitor--daemon", "stop").Return("", errors.New("not running"))
	withFakeRunner(t, fake)

	if err := SetFsMonitorEnabled("/repo", false); err != nil {
		t.Fatalf("SetFsMonitorEnabled: %v", err)
	}
	fake.AssertCalled(t, "config", "core.fsmonitor", "false")
	fake.AssertCalled(t, "config", "core.untrackedCache", "false")
	fake.AssertCalled(t, "fsmonitor--daemon", "stop")
}

func TestGetFsMonitorStateEmptyDir(t *testing.T) {
	fake := newFakeRunner()
	withFakeRunner(t, fake)

	state, err := GetFsMonitorState("")
	if err != nil {
		t.Fatalf("GetFsMonitorState: %v", err)
	}
	if state.Enabled {
		t.Fatalf("expected disabled, got %+v", state)
	}
	if len(fake.ArgsList()) != 0 {
		t.Fatalf("expected no git calls, got %v", fake.ArgsList())
	}
}
