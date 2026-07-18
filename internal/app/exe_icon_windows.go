//go:build windows

package app

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	shell32                    = windows.NewLazySystemDLL("shell32.dll")
	user32                     = windows.NewLazySystemDLL("user32.dll")
	gdi32                      = windows.NewLazySystemDLL("gdi32.dll")
	procExtractIconExW         = shell32.NewProc("ExtractIconExW")
	procDestroyIcon            = user32.NewProc("DestroyIcon")
	procDrawIconEx             = user32.NewProc("DrawIconEx")
	procGetDC                  = user32.NewProc("GetDC")
	procReleaseDC              = user32.NewProc("ReleaseDC")
	procGetIconInfo            = user32.NewProc("GetIconInfo")
	procCreateCompatibleDC     = gdi32.NewProc("CreateCompatibleDC")
	procDeleteDC               = gdi32.NewProc("DeleteDC")
	procCreateDIBSection       = gdi32.NewProc("CreateDIBSection")
	procSelectObject           = gdi32.NewProc("SelectObject")
	procDeleteObject           = gdi32.NewProc("DeleteObject")
	procGetObjectW             = gdi32.NewProc("GetObjectW")
)

type iconInfo struct {
	fIcon    int32
	xHotspot uint32
	yHotspot uint32
	hbmMask  windows.Handle
	hbmColor windows.Handle
}

type bitmap struct {
	bmType       int32
	bmWidth      int32
	bmHeight     int32
	bmWidthBytes int32
	bmPlanes     uint16
	bmBitsPixel  uint16
	bmBits       uintptr
}

type bitmapInfoHeader struct {
	biSize          uint32
	biWidth         int32
	biHeight        int32
	biPlanes        uint16
	biBitCount      uint16
	biCompression   uint32
	biSizeImage     uint32
	biXPelsPerMeter int32
	biYPelsPerMeter int32
	biClrUsed       uint32
	biClrImportant  uint32
}

type bitmapInfo struct {
	bmiHeader bitmapInfoHeader
	bmiColors [1]uint32
}

const (
	biRGB    = 0
	diNormal = 0x0003
)

func executableIconDataURL(commandOrPath string) (string, error) {
	resolved, err := resolveExecutablePath(commandOrPath)
	if err != nil {
		return "", nil
	}
	if _, err := os.Stat(resolved); err != nil {
		return "", nil
	}
	iconPath := preferIconExecutable(resolved)
	img, err := extractExeIconImage(iconPath)
	if err != nil || img == nil {
		return "", nil
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", nil
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

func extractExeIconImage(path string) (image.Image, error) {
	path, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}

	var large, small windows.Handle
	ret, _, _ := procExtractIconExW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		0,
		uintptr(unsafe.Pointer(&large)),
		uintptr(unsafe.Pointer(&small)),
		1,
	)
	if ret == 0 || ret == ^uintptr(0) {
		return nil, fmt.Errorf("ExtractIconExW failed for %s", path)
	}
	hIcon := large
	if hIcon == 0 {
		hIcon = small
	}
	if large != 0 && large != hIcon {
		destroyIcon(large)
	}
	if small != 0 && small != hIcon {
		destroyIcon(small)
	}
	if hIcon == 0 {
		return nil, fmt.Errorf("no icon in %s", path)
	}
	defer destroyIcon(hIcon)

	size := iconPixelSize(hIcon)
	if size <= 0 {
		size = 32
	}
	return drawIconToImage(hIcon, size)
}

func destroyIcon(h windows.Handle) {
	if h != 0 {
		procDestroyIcon.Call(uintptr(h))
	}
}

func iconPixelSize(hIcon windows.Handle) int {
	var info iconInfo
	ok, _, _ := procGetIconInfo.Call(uintptr(hIcon), uintptr(unsafe.Pointer(&info)))
	if ok == 0 {
		return 32
	}
	defer func() {
		if info.hbmColor != 0 {
			procDeleteObject.Call(uintptr(info.hbmColor))
		}
		if info.hbmMask != 0 {
			procDeleteObject.Call(uintptr(info.hbmMask))
		}
	}()

	var bm bitmap
	handle := info.hbmColor
	if handle == 0 {
		handle = info.hbmMask
	}
	if handle == 0 {
		return 32
	}
	n, _, _ := procGetObjectW.Call(uintptr(handle), unsafe.Sizeof(bm), uintptr(unsafe.Pointer(&bm)))
	if n == 0 || bm.bmWidth <= 0 {
		return 32
	}
	if info.hbmColor == 0 && bm.bmHeight == bm.bmWidth*2 {
		return int(bm.bmWidth)
	}
	return int(bm.bmWidth)
}

func drawIconToImage(hIcon windows.Handle, size int) (image.Image, error) {
	screenDC, _, _ := procGetDC.Call(0)
	if screenDC == 0 {
		return nil, fmt.Errorf("GetDC failed")
	}
	defer procReleaseDC.Call(0, screenDC)

	memDC, _, _ := procCreateCompatibleDC.Call(screenDC)
	if memDC == 0 {
		return nil, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(memDC)

	bi := bitmapInfo{
		bmiHeader: bitmapInfoHeader{
			biSize:        uint32(unsafe.Sizeof(bitmapInfoHeader{})),
			biWidth:       int32(size),
			biHeight:      -int32(size),
			biPlanes:      1,
			biBitCount:    32,
			biCompression: biRGB,
		},
	}
	var bits unsafe.Pointer
	hbm, _, _ := procCreateDIBSection.Call(
		memDC,
		uintptr(unsafe.Pointer(&bi)),
		0, // DIB_RGB_COLORS
		uintptr(unsafe.Pointer(&bits)),
		0,
		0,
	)
	if hbm == 0 || bits == nil {
		return nil, fmt.Errorf("CreateDIBSection failed")
	}
	defer procDeleteObject.Call(hbm)

	prev, _, _ := procSelectObject.Call(memDC, hbm)
	if prev == 0 {
		return nil, fmt.Errorf("SelectObject failed")
	}
	defer procSelectObject.Call(memDC, prev)

	ok, _, _ := procDrawIconEx.Call(
		memDC,
		0,
		0,
		uintptr(hIcon),
		uintptr(size),
		uintptr(size),
		0,
		0,
		diNormal,
	)
	if ok == 0 {
		return nil, fmt.Errorf("DrawIconEx failed")
	}

	src := unsafe.Slice((*byte)(bits), size*size*4)
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			i := (y*size + x) * 4
			b, g, r, a := src[i], src[i+1], src[i+2], src[i+3]
			j := img.PixOffset(x, y)
			img.Pix[j] = r
			img.Pix[j+1] = g
			img.Pix[j+2] = b
			img.Pix[j+3] = a
		}
	}
	return img, nil
}
