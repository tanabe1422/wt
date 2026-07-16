package app

import (
	"testing"

	"wt-manager/internal/git"
)

func TestPickWarmWorktreePath(t *testing.T) {
	entries := []git.WorktreeEntry{
		{Path: "/a-feature", IsMain: false},
		{Path: "/a", IsMain: true},
	}
	if got := pickWarmWorktreePath(entries); got != "/a" {
		t.Fatalf("got %q", got)
	}
	if got := pickWarmWorktreePath(nil); got != "" {
		t.Fatalf("empty got %q", got)
	}
	if got := pickWarmWorktreePath([]git.WorktreeEntry{{Path: "/only"}}); got != "/only" {
		t.Fatalf("fallback got %q", got)
	}
}
