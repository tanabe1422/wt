package app

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestPreferIconExecutableKeepsExe(t *testing.T) {
	got := preferIconExecutable(`C:\Tools\Cursor.exe`)
	if got != `C:\Tools\Cursor.exe` {
		t.Fatalf("got %q", got)
	}
}

func TestPreferIconExecutableFindsSiblingExe(t *testing.T) {
	dir := t.TempDir()
	cmdPath := filepath.Join(dir, "tool.cmd")
	exePath := filepath.Join(dir, "tool.exe")
	if err := os.WriteFile(cmdPath, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(exePath, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := preferIconExecutable(cmdPath)
	assertSameFile(t, got, exePath)
}

func TestPreferIconExecutableFindsCursorInstallLayout(t *testing.T) {
	root := t.TempDir()
	bin := filepath.Join(root, "resources", "app", "bin")
	if err := os.MkdirAll(bin, 0o755); err != nil {
		t.Fatal(err)
	}
	shim := filepath.Join(bin, "cursor")
	exe := filepath.Join(root, "Cursor.exe")
	if err := os.WriteFile(shim, []byte("#!/bin/sh\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(exe, []byte("MZ"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := preferIconExecutable(shim)
	assertSameFile(t, got, exe)
}

func TestPreferIconExecutableFindsCodeBinLayout(t *testing.T) {
	root := t.TempDir()
	bin := filepath.Join(root, "bin")
	if err := os.MkdirAll(bin, 0o755); err != nil {
		t.Fatal(err)
	}
	shim := filepath.Join(bin, "code.cmd")
	exe := filepath.Join(root, "Code.exe")
	if err := os.WriteFile(shim, []byte("@echo off\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(exe, []byte("MZ"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := preferIconExecutable(shim)
	assertSameFile(t, got, exe)
}

func assertSameFile(t *testing.T, got, want string) {
	t.Helper()
	gotInfo, err := os.Stat(got)
	if err != nil {
		t.Fatalf("stat got %q: %v", got, err)
	}
	wantInfo, err := os.Stat(want)
	if err != nil {
		t.Fatalf("stat want %q: %v", want, err)
	}
	if !os.SameFile(gotInfo, wantInfo) {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestExecutableIconDataURLEmptyPath(t *testing.T) {
	url, err := executableIconDataURL("  ")
	if err != nil {
		t.Fatal(err)
	}
	if url != "" {
		t.Fatalf("want empty, got %q", url)
	}
}

func TestExecutableIconDataURLSystemExe(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows only")
	}
	url, err := executableIconDataURL("notepad.exe")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(url, "data:image/png;base64,") {
		prefix := url
		if len(prefix) > 40 {
			prefix = prefix[:40]
		}
		t.Fatalf("unexpected icon data: %q", prefix)
	}
	if len(url) < 100 {
		t.Fatalf("icon data too short: %d", len(url))
	}
}

func TestExecutableIconDataURLCursorIfInstalled(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows only")
	}
	if _, err := exec.LookPath("cursor"); err != nil {
		t.Skip("cursor not on PATH")
	}
	url, err := executableIconDataURL("cursor")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(url, "data:image/png;base64,") {
		t.Fatalf("cursor icon missing; got %q", url)
	}
}
