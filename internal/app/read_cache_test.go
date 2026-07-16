package app

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestReadCacheInFlightCoalesce(t *testing.T) {
	cache := newReadCache[int]()
	var calls atomic.Int32
	started := make(chan struct{})
	release := make(chan struct{})

	load := func() (int, error) {
		calls.Add(1)
		close(started)
		<-release
		return 42, nil
	}

	var wg sync.WaitGroup
	results := make([]int, 2)
	errs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i], errs[i] = cache.getOrLoad("k", load)
		}(i)
	}

	<-started
	close(release)
	wg.Wait()

	if calls.Load() != 1 {
		t.Fatalf("expected 1 load, got %d", calls.Load())
	}
	for i := 0; i < 2; i++ {
		if errs[i] != nil || results[i] != 42 {
			t.Fatalf("caller %d: got %d %v", i, results[i], errs[i])
		}
	}
}

func TestReadCacheTTLHit(t *testing.T) {
	cache := newReadCache[int]()
	var calls atomic.Int32
	load := func() (int, error) {
		calls.Add(1)
		return 7, nil
	}

	if _, err := cache.getOrLoad("k", load); err != nil {
		t.Fatal(err)
	}
	if _, err := cache.getOrLoad("k", load); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 1 {
		t.Fatalf("expected TTL hit, calls=%d", calls.Load())
	}
}

func TestReadCacheClear(t *testing.T) {
	cache := newReadCache[int]()
	var calls atomic.Int32
	load := func() (int, error) {
		n := calls.Add(1)
		return int(n), nil
	}

	v1, _ := cache.getOrLoad("k", load)
	cache.clear()
	v2, _ := cache.getOrLoad("k", load)
	if v1 != 1 || v2 != 2 {
		t.Fatalf("got %d then %d", v1, v2)
	}
}

func TestReadCacheErrorNotCached(t *testing.T) {
	cache := newReadCache[int]()
	var calls atomic.Int32
	load := func() (int, error) {
		n := calls.Add(1)
		if n == 1 {
			return 0, errReadCacheTest
		}
		return 9, nil
	}

	if _, err := cache.getOrLoad("k", load); err == nil {
		t.Fatal("expected error")
	}
	v, err := cache.getOrLoad("k", load)
	if err != nil || v != 9 {
		t.Fatalf("got %d %v", v, err)
	}
	if calls.Load() != 2 {
		t.Fatalf("calls=%d", calls.Load())
	}
}

var errReadCacheTest = errString("boom")

type errString string

func (e errString) Error() string { return string(e) }

func TestReadCacheExpires(t *testing.T) {
	// Use a tiny TTL by temporarily swapping — exercise via clear + time is hard;
	// instead verify ready entry older than TTL reloads by manipulating slot.
	cache := newReadCache[int]()
	var calls atomic.Int32
	load := func() (int, error) {
		return int(calls.Add(1)), nil
	}
	if _, err := cache.getOrLoad("k", load); err != nil {
		t.Fatal(err)
	}

	cache.mu.Lock()
	slot := cache.slots["k"]
	cache.mu.Unlock()
	slot.mu.Lock()
	slot.at = time.Now().Add(-readCacheTTL - time.Second)
	slot.mu.Unlock()

	v, err := cache.getOrLoad("k", load)
	if err != nil || v != 2 {
		t.Fatalf("got %d %v after expiry", v, err)
	}
}
