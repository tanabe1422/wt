package git

import (
	"bytes"
	"io"
	"strings"
)

// ProgressFunc receives one progress line from git stderr (e.g. "Receiving objects: 45%").
type ProgressFunc func(line string)

// splitProgressLines splits git progress output on CR and LF.
// Git overwrites progress with \r; each segment is a distinct update.
func splitProgressLines(s string) []string {
	if s == "" {
		return nil
	}
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	var lines []string
	for _, part := range strings.Split(s, "\n") {
		part = strings.TrimSpace(part)
		if part != "" {
			lines = append(lines, part)
		}
	}
	return lines
}

// indexProgressDelim returns the index of the first \r or \n, or -1.
func indexProgressDelim(b []byte) int {
	for i, c := range b {
		if c == '\r' || c == '\n' {
			return i
		}
	}
	return -1
}

// scanProgressStream copies r into buf while emitting trimmed progress lines via onLine.
func scanProgressStream(r io.Reader, buf *bytes.Buffer, onLine ProgressFunc) error {
	tmp := make([]byte, 4096)
	var pending []byte
	for {
		n, err := r.Read(tmp)
		if n > 0 {
			chunk := tmp[:n]
			_, _ = buf.Write(chunk)
			pending = append(pending, chunk...)
			for {
				i := indexProgressDelim(pending)
				if i < 0 {
					break
				}
				line := strings.TrimSpace(string(pending[:i]))
				pending = pending[i+1:]
				if line != "" && onLine != nil {
					onLine(line)
				}
			}
		}
		if err == io.EOF {
			line := strings.TrimSpace(string(pending))
			if line != "" && onLine != nil {
				onLine(line)
			}
			return nil
		}
		if err != nil {
			return err
		}
	}
}

func runGitProgress(dir string, onLine ProgressFunc, args ...string) (string, error) {
	stdout, _, err := defaultRunner.RunProgress(dir, onLine, args...)
	return stdout, err
}

func runGitProgressCapture(dir string, onLine ProgressFunc, args ...string) (stdout, stderr string, err error) {
	return defaultRunner.RunProgress(dir, onLine, args...)
}
