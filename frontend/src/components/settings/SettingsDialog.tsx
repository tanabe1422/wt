import { useEffect, useState } from 'react'

import { openAppIcon } from '../icons/openAppIcons'
import { useExecutableIcons } from '../../hooks/useExecutableIcons'
import { getFsMonitor, getGitLogsDir, openGitLogsDir, pickFile, setFsMonitor } from '../../lib/wails'
import {
  applyPreset,
  emptyExternalTool,
  TOOL_PRESETS,
} from '../../lib/externalToolPresets'
import {
  createBlankOpenApp,
  createPresetOpenApp,
  OPEN_APP_PRESETS,
} from '../../lib/openAppPresets'
import type { ExternalTool, ExternalToolPreset, OpenApp, Settings } from '../../types'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import styles from './SettingsDialog.module.css'

type SettingsSection = 'performance' | 'diagnostics' | 'openApps' | 'diff'

const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'performance', label: 'パフォーマンス' },
  { id: 'diagnostics', label: '診断' },
  { id: 'openApps', label: 'アプリで開く' },
  { id: 'diff', label: 'Diff' },
]

interface SettingsDialogProps {
  open: boolean
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void | Promise<void>
  /** Opens the floating git debug panel (does not require saving). */
  onOpenGitDebug?: () => void
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

function OpenAppsSection({
  apps,
  onChange,
  saving,
}: {
  apps: OpenApp[]
  onChange: (next: OpenApp[]) => void
  saving: boolean
}) {
  const iconUrls = useExecutableIcons([
    ...apps.map((app) => app.path),
    ...OPEN_APP_PRESETS.map((preset) => preset.path),
  ])

  const updateApp = (id: string, patch: Partial<OpenApp>) => {
    onChange(apps.map((app) => (app.id === id ? { ...app, ...patch } : app)))
  }

  const removeApp = (id: string) => {
    onChange(apps.filter((app) => app.id !== id))
  }

  const handleBrowse = async (id: string) => {
    const path = await pickFile()
    if (path) {
      updateApp(id, { path })
    }
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>アプリで開く</h3>
      <div className={styles.toolBlock}>
        <p className={styles.toolDesc}>
          ワークツリーや変更ファイルの右クリックメニューから開けるアプリを登録します。引数の{' '}
          <code>{'{path}'}</code> はフォルダ／ファイルパスに置換されます。Windows では実行ファイルのアイコンを表示します。
        </p>
        <div className={styles.presetRow}>
          {OPEN_APP_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => onChange([...apps, createPresetOpenApp(preset)])}
            >
              <span className={styles.presetButtonContent}>
                {openAppIcon(preset.id, iconUrls[preset.path] ?? null)}
                {preset.label} を追加
              </span>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => onChange([...apps, createBlankOpenApp()])}
          >
            カスタムを追加
          </Button>
        </div>

        {apps.length === 0 ? (
          <p className={styles.hint}>まだ登録がありません。上のボタンから追加できます。</p>
        ) : (
          <ul className={styles.openAppList}>
            {apps.map((app) => (
              <li key={app.id} className={styles.openAppCard}>
                <div className={styles.openAppHeader}>
                  <span className={styles.openAppTitle}>
                    {openAppIcon(app.icon, iconUrls[app.path.trim()] ?? null)}
                    <span>{app.name.trim() || '名称未設定'}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => removeApp(app.id)}
                  >
                    削除
                  </Button>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>表示名</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={app.name}
                    disabled={saving}
                    placeholder="Cursor"
                    onChange={(event) => updateApp(app.id, { name: event.target.value })}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>パス</span>
                  <div className={styles.pathRow}>
                    <input
                      className={styles.input}
                      type="text"
                      value={app.path}
                      disabled={saving}
                      placeholder="実行ファイルのパスまたはコマンド名"
                      onChange={(event) => updateApp(app.id, { path: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => void handleBrowse(app.id)}
                    >
                      参照…
                    </Button>
                  </div>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>引数</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={app.args}
                    disabled={saving}
                    placeholder="{path}"
                    onChange={(event) => updateApp(app.id, { args: event.target.value })}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function SettingsDialog({
  open,
  settings,
  onClose,
  onSave,
  onOpenGitDebug,
}: SettingsDialogProps) {
  const [diffTool, setDiffTool] = useState<ExternalTool>(emptyExternalTool())
  const [mergeTool, setMergeTool] = useState<ExternalTool>(emptyExternalTool())
  const [openApps, setOpenApps] = useState<OpenApp[]>([])
  const [enableGitLogging, setEnableGitLogging] = useState(false)
  const [logsDir, setLogsDir] = useState('')
  const [fsMonitorEnabled, setFsMonitorEnabled] = useState(false)
  const [fsMonitorSupported, setFsMonitorSupported] = useState(true)
  const [fsMonitorLoaded, setFsMonitorLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>('performance')

  const activeRepo = settings.activeRepository?.trim() ?? ''

  useEffect(() => {
    if (!open) {
      return
    }
    setDiffTool({ ...emptyExternalTool(), ...settings.diffTool })
    setMergeTool({ ...emptyExternalTool(), ...settings.mergeTool })
    setOpenApps((settings.openApps ?? []).map((app) => ({ ...app })))
    setEnableGitLogging(settings.enableGitLogging ?? false)
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

    void getGitLogsDir()
      .then((dir) => {
        if (!cancelled) {
          setLogsDir(dir)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogsDir('')
        }
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

  const persistSettings = async () => {
    await onSave({
      ...settings,
      diffTool,
      mergeTool,
      openApps,
      enableGitLogging,
    })
    if (activeRepo && fsMonitorSupported && fsMonitorLoaded) {
      await setFsMonitor(activeRepo, fsMonitorEnabled)
    }
  }

  const handleApply = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await persistSettings()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndClose = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await persistSettings()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenLogs = async () => {
    try {
      await openGitLogsDir()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'ログフォルダを開けませんでした')
    }
  }

  const handleOpenGitDebug = () => {
    onOpenGitDebug?.()
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
          <nav className={styles.nav} role="tablist" aria-label="設定セクション">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={activeSection === section.id}
                className={cx(
                  styles.navItem,
                  activeSection === section.id && styles.navItemActive,
                )}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className={styles.panel} role="tabpanel">
            {activeSection === 'performance' ? (
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
            ) : null}

            {activeSection === 'diagnostics' ? (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>診断</h3>
                <div className={styles.toolBlock}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={enableGitLogging}
                      disabled={saving}
                      onChange={(event) => setEnableGitLogging(event.target.checked)}
                    />
                    <span className={styles.checkLabel}>Git 実行ログを有効にする</span>
                  </label>
                  <p className={styles.toolDesc}>
                    各 git コマンドの引数・所要時間・出力要約と、GIT_TRACE /
                    GIT_TRACE_PERFORMANCE をログファイルに書き出します。重い PC
                    での切り分け用です（通常はオフ推奨）。
                  </p>
                  {logsDir ? <p className={styles.hint}>{logsDir}</p> : null}
                  <div className={styles.pathRow}>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => void handleOpenLogs()}
                    >
                      ログフォルダを開く
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving || !onOpenGitDebug}
                      onClick={handleOpenGitDebug}
                    >
                      デバッグウィンドウを開く
                    </Button>
                  </div>
                  <p className={styles.toolDesc}>
                    デバッグウィンドウは実行中・直近の git コマンドを一覧表示します（通常利用では不要）。
                  </p>
                </div>
              </section>
            ) : null}

            {activeSection === 'openApps' ? (
              <OpenAppsSection apps={openApps} onChange={setOpenApps} saving={saving} />
            ) : null}

            {activeSection === 'diff' ? (
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
            ) : null}
          </div>
        </div>
        {saveError ? <p className={styles.error}>{saveError}</p> : null}
        <div className={styles.footer}>
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            キャンセル
          </Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={() => void handleApply()}>
            適用
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void handleSaveAndClose()}
          >
            保存して閉じる
          </Button>
        </div>
      </div>
    </div>
  )
}
