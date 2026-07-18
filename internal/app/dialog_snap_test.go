package app

import "testing"

func TestWithoutSnapToDefaultButtonCallsFn(t *testing.T) {
	got, err := withoutSnapToDefaultButton(func() (string, error) {
		return "ok", nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "ok" {
		t.Fatalf("got %q, want ok", got)
	}
}
