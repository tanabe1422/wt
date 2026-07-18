package git

import (
	"errors"
	"testing"
	"time"
)

func TestInflightTracksBeginAndEnd(t *testing.T) {
	resetInflightForTests()

	id := beginInflight("/repo", []string{"status", "--porcelain=v1"})
	snap := ListGitDebugSnapshot()
	if len(snap.Inflight) != 1 {
		t.Fatalf("inflight=%d want 1", len(snap.Inflight))
	}
	if snap.Inflight[0].ID != id {
		t.Fatalf("id=%d want %d", snap.Inflight[0].ID, id)
	}
	if got := FormatGitArgs(snap.Inflight[0].Args); got != "git status --porcelain=v1" {
		t.Fatalf("args=%q", got)
	}
	if len(snap.Recent) != 0 {
		t.Fatalf("recent=%d want 0", len(snap.Recent))
	}

	endInflight(id, nil)
	snap = ListGitDebugSnapshot()
	if len(snap.Inflight) != 0 {
		t.Fatalf("inflight after end=%d want 0", len(snap.Inflight))
	}
	if len(snap.Recent) != 1 {
		t.Fatalf("recent=%d want 1", len(snap.Recent))
	}
	if snap.Recent[0].Error != "" {
		t.Fatalf("error=%q want empty", snap.Recent[0].Error)
	}
}

func TestInflightRecordsErrorAndCapsRecent(t *testing.T) {
	resetInflightForTests()

	for i := 0; i < maxRecentGitCommands+5; i++ {
		id := beginInflight("/repo", []string{"rev-parse", "HEAD"})
		endInflight(id, errors.New("boom"))
	}
	snap := ListGitDebugSnapshot()
	if len(snap.Recent) != maxRecentGitCommands {
		t.Fatalf("recent=%d want %d", len(snap.Recent), maxRecentGitCommands)
	}
	if snap.Recent[0].Error != "boom" {
		t.Fatalf("newest error=%q", snap.Recent[0].Error)
	}
}

func TestInflightSortedByStart(t *testing.T) {
	resetInflightForTests()

	id1 := beginInflight("/a", []string{"status"})
	time.Sleep(2 * time.Millisecond)
	id2 := beginInflight("/b", []string{"fetch"})
	snap := ListGitDebugSnapshot()
	if len(snap.Inflight) != 2 {
		t.Fatalf("inflight=%d want 2", len(snap.Inflight))
	}
	if snap.Inflight[0].ID != id1 || snap.Inflight[1].ID != id2 {
		t.Fatalf("order=%v,%v want %v,%v", snap.Inflight[0].ID, snap.Inflight[1].ID, id1, id2)
	}
}

func TestLastMinuteCountIncludesBeyondRecentCap(t *testing.T) {
	resetInflightForTests()

	n := maxRecentGitCommands + 10
	for i := 0; i < n; i++ {
		id := beginInflight("/repo", []string{"status"})
		endInflight(id, nil)
	}
	snap := ListGitDebugSnapshot()
	if snap.LastMinuteCount != n {
		t.Fatalf("lastMinuteCount=%d want %d", snap.LastMinuteCount, n)
	}
	if len(snap.Recent) != maxRecentGitCommands {
		t.Fatalf("recent=%d want %d", len(snap.Recent), maxRecentGitCommands)
	}
}

func TestLastMinuteCountPrunesOldStarts(t *testing.T) {
	resetInflightForTests()

	inflightMu.Lock()
	old := time.Now().Add(-2 * time.Minute).UnixMilli()
	recentStartTimes = []int64{old, old + 1}
	inflightMu.Unlock()

	id := beginInflight("/repo", []string{"status"})
	endInflight(id, nil)

	snap := ListGitDebugSnapshot()
	if snap.LastMinuteCount != 1 {
		t.Fatalf("lastMinuteCount=%d want 1 (old starts pruned)", snap.LastMinuteCount)
	}
}
