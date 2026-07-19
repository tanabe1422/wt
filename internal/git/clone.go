package git

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// CloneWithProgress clones url into destPath and reports stderr progress lines.
// destPath must not already exist; its parent directory must exist.
func CloneWithProgress(url, destPath string, onProgress ProgressFunc) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return errors.New("リポジトリ URL を入力してください")
	}

	dest, err := filepath.Abs(filepath.Clean(destPath))
	if err != nil {
		return err
	}
	if dest == "" || dest == "." {
		return errors.New("保存先ディレクトリを指定してください")
	}

	if _, err := os.Stat(dest); err == nil {
		return fmt.Errorf("保存先が既に存在します: %s", dest)
	} else if !os.IsNotExist(err) {
		return err
	}

	parent := filepath.Dir(dest)
	parentInfo, err := os.Stat(parent)
	if err != nil {
		if os.IsNotExist(err) {
			return errors.New("保存先の親ディレクトリが存在しません")
		}
		return err
	}
	if !parentInfo.IsDir() {
		return errors.New("保存先の親ディレクトリが存在しません")
	}

	_, err = runGitProgress(parent, onProgress, cloneArgs(url, dest)...)
	if err != nil {
		// git clone may leave a partial directory; remove it so retry can reuse the path.
		if _, statErr := os.Stat(dest); statErr == nil {
			_ = os.RemoveAll(dest)
		}
		return err
	}
	return nil
}

func cloneArgs(url, dest string) []string {
	return []string{"clone", "--progress", url, dest}
}
