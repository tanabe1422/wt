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
	recentStartTimes = []recentStartMark{{at: old}, {at: old + 1, kind: startNetwork}}
	inflightMu.Unlock()

	id := beginInflight("/repo", []string{"status"})
	endInflight(id, nil)

	snap := ListGitDebugSnapshot()
	if snap.LastMinuteCount != 1 {
		t.Fatalf("lastMinuteCount=%d want 1 (old starts pruned)", snap.LastMinuteCount)
	}
}

func TestIsNetworkGitArgs(t *testing.T) {
	cases := []struct {
		args []string
		want bool
	}{
		{[]string{"status"}, false},
		{[]string{"stash", "push"}, false},
		{[]string{"fetch", "--progress"}, true},
		{[]string{"pull", "--rebase"}, true},
		{[]string{"push", "--progress"}, true},
		{[]string{"ls-remote", "origin"}, true},
		{[]string{"clone", "url"}, true},
		{nil, false},
	}
	for _, tc := range cases {
		if got := isNetworkGitArgs(tc.args); got != tc.want {
			t.Fatalf("isNetworkGitArgs(%v)=%v want %v", tc.args, got, tc.want)
		}
	}
}

func TestLastMinuteSplitsLocalAndNetwork(t *testing.T) {
	resetInflightForTests()

	for _, args := range [][]string{
		{"status"},
		{"rev-parse", "HEAD"},
		{"fetch", "--progress"},
		{"push", "--progress"},
		{"stash", "push"},
	} {
		id := beginInflight("/repo", args)
		endInflight(id, nil)
	}

	snap := ListGitDebugSnapshot()
	if snap.LastMinuteCount != 5 {
		t.Fatalf("lastMinuteCount=%d want %d", snap.LastMinuteCount, 5)
	}
	if snap.LastMinuteLocalCount != 3 {
		t.Fatalf("lastMinuteLocalCount=%d want 3", snap.LastMinuteLocalCount)
	}
	if snap.LastMinuteNetworkCount != 2 {
		t.Fatalf("lastMinuteNetworkCount=%d want 2", snap.LastMinuteNetworkCount)
	}
	if snap.LastMinuteGoGitCount != 0 {
		t.Fatalf("lastMinuteGoGitCount=%d want 0", snap.LastMinuteGoGitCount)
	}
}

func TestGoGitCountIsSeparateFromLocal(t *testing.T) {
	resetInflightForTests()

	id := beginInflight("/repo", []string{"status"})
	endInflight(id, nil)
	recordGoGitStart()
	recordGoGitStart()

	snap := ListGitDebugSnapshot()
	if snap.LastMinuteLocalCount != 1 {
		t.Fatalf("lastMinuteLocalCount=%d want 1", snap.LastMinuteLocalCount)
	}
	if snap.LastMinuteGoGitCount != 2 {
		t.Fatalf("lastMinuteGoGitCount=%d want 2", snap.LastMinuteGoGitCount)
	}
	if snap.LastMinuteCount != 3 {
		t.Fatalf("lastMinuteCount=%d want 3", snap.LastMinuteCount)
	}
	if len(snap.Recent) != 1 {
		t.Fatalf("recent=%d want 1 (go-git not in CLI recent)", len(snap.Recent))
	}
}

func TestInflightNetworkCount(t *testing.T) {
	resetInflightForTests()

	beginInflight("/repo", []string{"status"})
	beginInflight("/repo", []string{"fetch", "--progress"})
	beginInflight("/repo", []string{"push", "--progress"})

	snap := ListGitDebugSnapshot()
	if len(snap.Inflight) != 3 {
		t.Fatalf("inflight=%d want 3", len(snap.Inflight))
	}
	if snap.InflightNetworkCount != 2 {
		t.Fatalf("inflightNetworkCount=%d want 2", snap.InflightNetworkCount)
	}
}
