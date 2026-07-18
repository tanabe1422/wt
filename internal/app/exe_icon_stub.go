//go:build !windows

package app

func executableIconDataURL(commandOrPath string) (string, error) {
	_ = commandOrPath
	return "", nil
}
