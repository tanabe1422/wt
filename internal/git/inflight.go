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
	Inflight               []InflightGitCommand `json:"inflight"`
	Recent                 []RecentGitCommand   `json:"recent"`
	LastMinuteCount        int                  `json:"lastMinuteCount"`
	LastMinuteLocalCount   int                  `json:"lastMinuteLocalCount"`
	LastMinuteNetworkCount int                  `json:"lastMinuteNetworkCount"`
	LastMinuteGoGitCount   int                  `json:"lastMinuteGoGitCount"`
	InflightNetworkCount   int                  `json:"inflightNetworkCount"`
}

type inflightEntry struct {
	id        uint64
	dir       string
	args      []string
	startedAt time.Time
}

type startKind uint8

const (
	startLocal startKind = iota
	startNetwork
	startGoGit
)

// recentStartMark records when a git operation started and its kind.
type recentStartMark struct {
	at   int64
	kind startKind
}

var (
	inflightMu       sync.Mutex
	inflightNextID   atomic.Uint64
	inflightActive   = map[uint64]*inflightEntry{}
	recentGitRing    []RecentGitCommand
	recentStartTimes []recentStartMark // pruned to lastMinuteWindow
)

// isNetworkGitArgs reports whether args are for a network-touching git subcommand
// (fetch / pull / push / ls-remote / clone). Nested commands like `stash push` are local.
func isNetworkGitArgs(args []string) bool {
	if len(args) == 0 {
		return false
	}
	switch args[0] {
	case "fetch", "pull", "push", "ls-remote", "clone":
		return true
	default:
		return false
	}
}

func beginInflight(dir string, args []string) uint64 {
	id := inflightNextID.Add(1)
	cp := append([]string(nil), args...)
	now := time.Now()
	kind := startLocal
	if isNetworkGitArgs(cp) {
		kind = startNetwork
	}
	inflightMu.Lock()
	inflightActive[id] = &inflightEntry{
		id:        id,
		dir:       dir,
		args:      cp,
		startedAt: now,
	}
	recentStartTimes = append(recentStartTimes, recentStartMark{
		at:   now.UnixMilli(),
		kind: kind,
	})
	pruneRecentStartTimesLocked(now)
	inflightMu.Unlock()
	return id
}

// recordGoGitStart counts a go-git hotpath open toward lastMinuteGoGitCount.
// It does not appear in Inflight / Recent (CLI debug lists stay CLI-only).
func recordGoGitStart() {
	now := time.Now()
	inflightMu.Lock()
	recentStartTimes = append(recentStartTimes, recentStartMark{
		at:   now.UnixMilli(),
		kind: startGoGit,
	})
	pruneRecentStartTimesLocked(now)
	inflightMu.Unlock()
}

// pruneRecentStartTimesLocked drops start timestamps older than lastMinuteWindow.
// Caller must hold inflightMu.
func pruneRecentStartTimesLocked(now time.Time) {
	cutoff := now.Add(-lastMinuteWindow).UnixMilli()
	i := 0
	for i < len(recentStartTimes) && recentStartTimes[i].at < cutoff {
		i++
	}
	if i == 0 {
		return
	}
	recentStartTimes = append([]recentStartMark(nil), recentStartTimes[i:]...)
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
	lastMinuteLocal := 0
	lastMinuteNetwork := 0
	lastMinuteGoGit := 0
	for _, mark := range recentStartTimes {
		switch mark.kind {
		case startNetwork:
			lastMinuteNetwork++
		case startGoGit:
			lastMinuteGoGit++
		default:
			lastMinuteLocal++
		}
	}

	inflight := make([]InflightGitCommand, 0, len(inflightActive))
	inflightNetwork := 0
	for _, entry := range inflightActive {
		if isNetworkGitArgs(entry.args) {
			inflightNetwork++
		}
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
		Inflight:               inflight,
		Recent:                 recent,
		LastMinuteCount:        lastMinuteCount,
		LastMinuteLocalCount:   lastMinuteLocal,
		LastMinuteNetworkCount: lastMinuteNetwork,
		LastMinuteGoGitCount:   lastMinuteGoGit,
		InflightNetworkCount:   inflightNetwork,
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
