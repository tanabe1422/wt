import { useEffect, useState } from 'react'

import { getFsMonitor, pickFile, setFsMonitor } from '../../lib/wails'
import {
  applyPreset,
  emptyExternalTool,
  TOOL_PRESETS,
} from '../../lib/externalToolPresets'
import type { ExternalTool, ExternalToolPreset, Settings } from '../../types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import styles from './SettingsDialog.module.css'

interface SettingsDialogProps {
  open: boolean
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void | Promise<void>
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ToolFields({
  title,
  description,
  placeholders,
  kind,
  value,
  onChange,
}: {
  title: string
  description: string
  placeholders: string
  kind: 'diff' | 'merge'
  value: ExternalTool
  onChange: (next: ExternalTool) => void
}) {
  const handlePresetChange = (preset: ExternalToolPreset) => {
    onChange(applyPreset(kind, preset, value))
  }

  const handleBrowse = async () => {
    const path = await pickFile()
    if (path) {
      onChange({ ...value, path, preset: value.preset || 'custom' })
    }
  }

  return (
    <div className={styles.toolBlock}>
      <h3 className={styles.toolTitle}>{title}</h3>
      <p className={styles.toolDesc}>{description}</p>

      <label className={styles.field}>
        <span className={styles.label}>アプリ</span>
        <select
          className={styles.select}
          value={value.preset || 'custom'}
          onChange={(event) => handlePresetChange(event.target.value as ExternalToolPreset)}
        >
          {TOOL_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>パス</span>
        <div className={styles.pathRow}>
          <input
            className={styles.input}
            type="text"
            value={value.path}
            placeholder="実行ファイルのパスまたはコマンド名"
            onChange={(event) =>
              onChange({ ...value, path: event.target.value, preset: value.preset || 'custom' })
            }
          />
          <Button type="button" variant="ghost" onClick={() => void handleBrowse()}>
            参照…
          </Button>
        </div>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>引数</span>
        <input
          className={styles.input}
          type="text"
          value={value.args}
          placeholder={placeholders}
          onChange={(event) =>
            onChange({ ...value, args: event.target.value, preset: value.preset || 'custom' })
          }
        />
      </label>
      <p className={styles.hint}>プレースホルダ: {placeholders}</p>
    </div>
  )
}

export function SettingsDialog({ open, settings, onClose, onSave }: SettingsDialogProps) {
  const [diffTool, setDiffTool] = useState<ExternalTool>(emptyExternalTool())
  const [mergeTool, setMergeTool] = useState<ExternalTool>(emptyExternalTool())
  const [fsMonitorEnabled, setFsMonitorEnabled] = useState(false)
  const [fsMonitorSupported, setFsMonitorSupported] = useState(true)
  const [fsMonitorLoaded, setFsMonitorLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const activeRepo = settings.activeRepository?.trim() ?? ''

  useEffect(() => {
    if (!open) {
      return
    }
    setDiffTool({ ...emptyExternalTool(), ...settings.diffTool })
    setMergeTool({ ...emptyExternalTool(), ...settings.mergeTool })
    setSaveError(null)
    setFsMonitorLoaded(false)

    let cancelled = false
    void getFsMonitor(activeRepo)
      .then((state) => {
        if (cancelled) {
          return
        }
        setFsMonitorSupported(state.supported)
        setFsMonitorEnabled(state.enabled)
        setFsMonitorLoaded(true)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setFsMonitorSupported(false)
        setFsMonitorEnabled(false)
        setFsMonitorLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [open, settings, activeRepo])

  if (!open) {
    return null
  }

  const fsMonitorDisabled =
    !activeRepo || !fsMonitorSupported || !fsMonitorLoaded || saving

  const fsMonitorHint = !activeRepo
    ? 'アクティブなリポジトリがないため変更できません。'
    : !fsMonitorSupported
      ? 'この OS では Git 内蔵 FSMonitor を利用できません（Windows / macOS 向け）。'
      : '大きいリポジトリで git status を速くします。core.fsmonitor と core.untrackedCache をリポジトリに設定します。'

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        ...settings,
        diffTool,
        mergeTool,
      })
      if (activeRepo && fsMonitorSupported && fsMonitorLoaded) {
        await setFsMonitor(activeRepo, fsMonitorEnabled)
      }
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="settings-dialog-title">設定</h2>
          <IconButton type="button" aria-label="閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>パフォーマンス</h3>
            <div className={styles.toolBlock}>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={fsMonitorEnabled}
                  disabled={fsMonitorDisabled}
                  onChange={(event) => setFsMonitorEnabled(event.target.checked)}
                />
                <span className={styles.checkLabel}>
                  ファイルシステム監視（FSMonitor）を有効にする
                </span>
              </label>
              <p className={styles.toolDesc}>{fsMonitorHint}</p>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Diff</h3>
            <ToolFields
              title="差分を外部ツールで開く"
              description="変更ファイルの差分を外部アプリで開くときの設定です。"
              placeholders="$LOCAL $REMOTE"
              kind="diff"
              value={diffTool}
              onChange={setDiffTool}
            />
            <ToolFields
              title="外部ツールで競合を解決"
              description="競合ファイルを外部マージツールで開くときの設定です。"
              placeholders="$BASE $LOCAL $REMOTE $MERGED"
              kind="merge"
              value={mergeTool}
              onChange={setMergeTool}
            />
          </section>
          {saveError ? <p className={styles.error}>{saveError}</p> : null}
          <div className={styles.footer}>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              キャンセル
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
