package app

import (
	"sync"
	"time"

	"wt-manager/internal/git"
)

// Short TTL so startup warm can be reused by the first FE calls without
// serving stale data long after mutations. Mutations clear the cache.
const readCacheTTL = 3 * time.Second

type readCacheSlot[T any] struct {
	mu       sync.Mutex
	inflight chan struct{} // non-nil while load runs; closed when done
	value    T
	err      error
	ready    bool
	at       time.Time
}

type readCache[T any] struct {
	mu    sync.Mutex
	slots map[string]*readCacheSlot[T]
}

func newReadCache[T any]() *readCache[T] {
	return &readCache[T]{slots: make(map[string]*readCacheSlot[T])}
}

func (c *readCache[T]) getOrLoad(key string, load func() (T, error)) (T, error) {
	if key == "" {
		return load()
	}

	c.mu.Lock()
	slot, ok := c.slots[key]
	if !ok {
		slot = &readCacheSlot[T]{}
		c.slots[key] = slot
	}
	c.mu.Unlock()

	for {
		slot.mu.Lock()
		if slot.ready && time.Since(slot.at) < readCacheTTL {
			v, err := slot.value, slot.err
			slot.mu.Unlock()
			return v, err
		}
		if slot.inflight != nil {
			wait := slot.inflight
			slot.mu.Unlock()
			<-wait
			continue
		}

		done := make(chan struct{})
		slot.inflight = done
		slot.ready = false
		slot.mu.Unlock()

		v, err := load()

		slot.mu.Lock()
		slot.value = v
		slot.err = err
		if err == nil {
			slot.ready = true
			slot.at = time.Now()
		} else {
			slot.ready = false
		}
		slot.inflight = nil
		slot.mu.Unlock()
		close(done)
		return v, err
	}
}

func (c *readCache[T]) clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.slots = make(map[string]*readCacheSlot[T])
}

var (
	branchesReadCache  = newReadCache[[]git.BranchEntry]()
	worktreesReadCache = newReadCache[[]git.WorktreeEntry]()
	statusReadCache    = newReadCache[[]git.FileStatus]()
)

func clearGitReadCaches() {
	branchesReadCache.clear()
	worktreesReadCache.clear()
	statusReadCache.clear()
	git.InvalidateNativeRepoCache()
}

func clearGitReadCachesForTests() {
	clearGitReadCaches()
}
