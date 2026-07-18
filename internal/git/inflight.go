package git

import (
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	maxRecentGitCommands = 40
	lastMinuteWindow     = time.Minute
)

// InflightGitCommand is a git process that has started but not finished.
type InflightGitCommand struct {
	ID        uint64   `json:"id"`
	Dir       string   `json:"dir"`
	Args      []string `json:"args"`
	StartedAt int64    `json:"startedAt"` // unix milliseconds
}

// RecentGitCommand is a recently finished git process (debug ring buffer).
type RecentGitCommand struct {
	Dir        string   `json:"dir"`
	Args       []string `json:"args"`
	StartedAt  int64    `json:"startedAt"`
	EndedAt    int64    `json:"endedAt"`
	DurationMs int64    `json:"durationMs"`
	Error      string   `json:"error"`
}

// GitDebugSnapshot is the payload for the debug window.
type GitDebugSnapshot struct {
	Inflight        []InflightGitCommand `json:"inflight"`
	Recent          []RecentGitCommand   `json:"recent"`
	LastMinuteCount int                  `json:"lastMinuteCount"`
}

type inflightEntry struct {
	id        uint64
	dir       string
	args      []string
	startedAt time.Time
}

var (
	inflightMu       sync.Mutex
	inflightNextID   atomic.Uint64
	inflightActive   = map[uint64]*inflightEntry{}
	recentGitRing    []RecentGitCommand
	recentStartTimes []int64 // unix ms; pruned to lastMinuteWindow
)

func beginInflight(dir string, args []string) uint64 {
	id := inflightNextID.Add(1)
	cp := append([]string(nil), args...)
	now := time.Now()
	inflightMu.Lock()
	inflightActive[id] = &inflightEntry{
		id:        id,
		dir:       dir,
		args:      cp,
		startedAt: now,
	}
	recentStartTimes = append(recentStartTimes, now.UnixMilli())
	pruneRecentStartTimesLocked(now)
	inflightMu.Unlock()
	return id
}

// pruneRecentStartTimesLocked drops start timestamps older than lastMinuteWindow.
// Caller must hold inflightMu.
func pruneRecentStartTimesLocked(now time.Time) {
	cutoff := now.Add(-lastMinuteWindow).UnixMilli()
	i := 0
	for i < len(recentStartTimes) && recentStartTimes[i] < cutoff {
		i++
	}
	if i == 0 {
		return
	}
	recentStartTimes = append([]int64(nil), recentStartTimes[i:]...)
}

func endInflight(id uint64, runErr error) {
	inflightMu.Lock()
	defer inflightMu.Unlock()
	entry, ok := inflightActive[id]
	if !ok {
		return
	}
	delete(inflightActive, id)
	ended := time.Now()
	errMsg := ""
	if runErr != nil {
		errMsg = runErr.Error()
	}
	recentGitRing = append(recentGitRing, RecentGitCommand{
		Dir:        entry.dir,
		Args:       entry.args,
		StartedAt:  entry.startedAt.UnixMilli(),
		EndedAt:    ended.UnixMilli(),
		DurationMs: ended.Sub(entry.startedAt).Milliseconds(),
		Error:      errMsg,
	})
	if len(recentGitRing) > maxRecentGitCommands {
		recentGitRing = recentGitRing[len(recentGitRing)-maxRecentGitCommands:]
	}
}

// ListGitDebugSnapshot returns in-flight and recent git commands for the debug UI.
func ListGitDebugSnapshot() GitDebugSnapshot {
	inflightMu.Lock()
	defer inflightMu.Unlock()

	now := time.Now()
	pruneRecentStartTimesLocked(now)
	lastMinuteCount := len(recentStartTimes)

	inflight := make([]InflightGitCommand, 0, len(inflightActive))
	for _, entry := range inflightActive {
		inflight = append(inflight, InflightGitCommand{
			ID:        entry.id,
			Dir:       entry.dir,
			Args:      append([]string(nil), entry.args...),
			StartedAt: entry.startedAt.UnixMilli(),
		})
	}
	sort.Slice(inflight, func(i, j int) bool {
		if inflight[i].StartedAt != inflight[j].StartedAt {
			return inflight[i].StartedAt < inflight[j].StartedAt
		}
		return inflight[i].ID < inflight[j].ID
	})

	recent := make([]RecentGitCommand, len(recentGitRing))
	copy(recent, recentGitRing)
	// Newest first for the UI.
	for i, j := 0, len(recent)-1; i < j; i, j = i+1, j-1 {
		recent[i], recent[j] = recent[j], recent[i]
	}

	return GitDebugSnapshot{
		Inflight:        inflight,
		Recent:          recent,
		LastMinuteCount: lastMinuteCount,
	}
}

// FormatGitArgs renders `git <args…>` for display.
func FormatGitArgs(args []string) string {
	if len(args) == 0 {
		return "git"
	}
	return "git " + strings.Join(args, " ")
}

// resetInflightForTests clears inflight tracking state (tests only).
func resetInflightForTests() {
	inflightMu.Lock()
	defer inflightMu.Unlock()
	inflightActive = map[uint64]*inflightEntry{}
	recentGitRing = nil
	recentStartTimes = nil
	inflightNextID.Store(0)
}
