//go:build !windows

package app

func withoutSnapToDefaultButton(fn func() (string, error)) (string, error) {
	return fn()
}
