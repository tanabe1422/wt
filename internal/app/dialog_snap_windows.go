//go:build windows

package app

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	spiGetSnapToDefButton = 0x005F
	spiSetSnapToDefButton = 0x0060
)

var procSystemParametersInfoW = windows.NewLazySystemDLL("user32.dll").NewProc("SystemParametersInfoW")

// withoutSnapToDefaultButton temporarily disables Windows "Snap To" (move pointer
// to the default button in a dialog) so native folder/file pickers do not yank
// the cursor to 「フォルダーの選択」 / OK.
func withoutSnapToDefaultButton(fn func() (string, error)) (string, error) {
	var enabled int32
	r, _, _ := procSystemParametersInfoW.Call(spiGetSnapToDefButton, 0, uintptr(unsafe.Pointer(&enabled)), 0)
	if r == 0 || enabled == 0 {
		return fn()
	}

	r, _, _ = procSystemParametersInfoW.Call(spiSetSnapToDefButton, 0, 0, 0)
	if r == 0 {
		return fn()
	}
	defer procSystemParametersInfoW.Call(spiSetSnapToDefButton, uintptr(uint32(enabled)), 0, 0)

	return fn()
}
