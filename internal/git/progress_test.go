package git

import (
	"bytes"
	"strings"
	"testing"
)

func TestSplitProgressLines(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{name: "empty", in: "", want: nil},
		{
			name: "lf only",
			in:   "Enumerating objects: 10, done.\nCounting objects: 100% (10/10), done.\n",
			want: []string{
				"Enumerating objects: 10, done.",
				"Counting objects: 100% (10/10), done.",
			},
		},
		{
			name: "cr overwrite",
			in:   "Receiving objects:  45% (450/1000)\rReceiving objects:  90% (900/1000)\rReceiving objects: 100% (1000/1000), done.\n",
			want: []string{
				"Receiving objects:  45% (450/1000)",
				"Receiving objects:  90% (900/1000)",
				"Receiving objects: 100% (1000/1000), done.",
			},
		},
		{
			name: "crlf",
			in:   "From origin\r\n * [new branch] main -> origin/main\r\n",
			want: []string{
				"From origin",
				"* [new branch] main -> origin/main",
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := splitProgressLines(tc.in)
			if len(got) != len(tc.want) {
				t.Fatalf("splitProgressLines()=%v want %v", got, tc.want)
			}
			for i := range tc.want {
				if got[i] != tc.want[i] {
					t.Fatalf("splitProgressLines()[%d]=%q want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestScanProgressStream(t *testing.T) {
	input := "Receiving objects:  10% (1/10)\rReceiving objects: 100% (10/10), done.\nWriting objects: 100% (2/2), done.\n"
	var buf bytes.Buffer
	var lines []string
	err := scanProgressStream(strings.NewReader(input), &buf, func(line string) {
		lines = append(lines, line)
	})
	if err != nil {
		t.Fatalf("scanProgressStream: %v", err)
	}
	want := []string{
		"Receiving objects:  10% (1/10)",
		"Receiving objects: 100% (10/10), done.",
		"Writing objects: 100% (2/2), done.",
	}
	if len(lines) != len(want) {
		t.Fatalf("lines=%v want %v", lines, want)
	}
	for i := range want {
		if lines[i] != want[i] {
			t.Fatalf("lines[%d]=%q want %q", i, lines[i], want[i])
		}
	}
	if buf.String() != input {
		t.Fatalf("buf=%q want %q", buf.String(), input)
	}
}
