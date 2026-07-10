import type { FileDiff } from '../../types'
import { Button } from '../ui/Button'
import { cx } from '../../utils/cx'
import styles from './DiffView.module.css'

export interface DiffViewProps {
  diff: FileDiff | null
  loading: boolean
  error: string | null
  file: string | null
  staged?: boolean
  conflict?: boolean
  busy?: boolean
  onStageHunk?: (hunkIndex: number) => void
  onUnstageHunk?: (hunkIndex: number) => void
  onDiscardHunk?: (hunkIndex: number) => void
}

export function DiffView({
  diff,
  loading,
  error,
  file,
  staged = false,
  conflict = false,
  busy = false,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: DiffViewProps) {
  if (!file) {
    return (
      <div className={styles.panel}>
        <p className={styles.placeholder}>ファイルを選択すると diff が表示されます</p>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.fileName}>{file}</h2>
      </header>
      <div className={styles.content}>
        {loading ? (
          <p className={styles.placeholder}>読み込み中…</p>
        ) : error ? (
          <p className={styles.placeholder}>差分を表示できません</p>
        ) : !diff || diff.hunks.length === 0 ? (
          <p className={styles.placeholder}>
            {conflict
              ? '競合中のファイルです。右クリックから「外部ツールで競合を解決」を選んでください。'
              : '差分がありません'}
          </p>
        ) : (
          diff.hunks.map((hunk, index) => (
            <section key={`${hunk.header}-${index}`} className={styles.hunk}>
              <div className={styles.hunkHeader}>
                <span className={styles.hunkRange}>{hunk.header}</span>
                <div className={styles.hunkActions}>
                  {!conflict && !staged && onStageHunk && (
                    <Button
                      type="button"
                      className={styles.hunkAction}
                      disabled={busy}
                      onClick={() => onStageHunk(index)}
                    >
                      Hunkをステージに移動
                    </Button>
                  )}
                  {!conflict && staged && onUnstageHunk && (
                    <Button
                      type="button"
                      className={styles.hunkAction}
                      disabled={busy}
                      onClick={() => onUnstageHunk(index)}
                    >
                      Hunkをアンステージに移動
                    </Button>
                  )}
                  {!conflict && onDiscardHunk && (
                    <Button
                      type="button"
                      className={cx(styles.hunkAction, styles.hunkActionDanger)}
                      disabled={busy}
                      onClick={() => onDiscardHunk(index)}
                    >
                      Hunkを破棄
                    </Button>
                  )}
                </div>
              </div>
              <pre className={styles.lines}>
                {hunk.lines.map((line, lineIndex) => (
                  <div key={`${index}-${lineIndex}`} className={styles.line}>
                    <div className={styles.lineNums}>
                      <span className={styles.lineNo}>
                        {line.oldNo ? String(line.oldNo) : ''}
                      </span>
                      <span className={styles.lineNo}>
                        {line.newNo ? String(line.newNo) : ''}
                      </span>
                    </div>
                    <div
                      className={cx(
                        styles.lineBody,
                        line.kind === 'add' && styles.add,
                        line.kind === 'del' && styles.del,
                      )}
                    >
                      <span className={styles.prefix}>
                        {line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}
                      </span>
                      <span className={styles.text}>{line.content}</span>
                    </div>
                  </div>
                ))}
              </pre>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
