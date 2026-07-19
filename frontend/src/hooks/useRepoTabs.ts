import { useCallback, useEffect, useState } from 'react'

import { emptyExternalTool, migrateExternalTool } from '../lib/externalToolPresets'
import { prefetchRepo } from '../lib/repoPrefetch'
import {
  addRepository,
  cloneRepository,
  getSettings,
  pickDirectory,
  removeRepository,
  saveSettings,
  setActiveRepository,
  setMergeAllowFastForward,
  setPushAfterCommit,
} from '../lib/wails'
import type { Settings } from '../types'

const emptySettings: Settings = {
  repositories: [],
  activeRepository: '',
  diffTool: emptyExternalTool(),
  mergeTool: emptyExternalTool(),
  openApps: [],
  remoteCleanupExcluded: ['main', 'master', 'develop'],
  pushAfterCommit: {},
  mergeAllowFastForward: {},
  enableGitLogging: false,
}

function normalizeLoadedSettings(settings: Settings): Settings {
  return {
    ...settings,
    repositories: settings.repositories ?? [],
    activeRepository: settings.activeRepository ?? '',
    diffTool: migrateExternalTool({ ...emptyExternalTool(), ...settings.diffTool }),
    mergeTool: migrateExternalTool({ ...emptyExternalTool(), ...settings.mergeTool }),
    openApps: (settings.openApps ?? []).map((app) => ({ ...app })),
    remoteCleanupExcluded: settings.remoteCleanupExcluded ?? ['main', 'master', 'develop'],
    pushAfterCommit: settings.pushAfterCommit ?? {},
    mergeAllowFastForward: settings.mergeAllowFastForward ?? {},
    enableGitLogging: settings.enableGitLogging ?? false,
  }
}

export function useRepoTabs() {
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)

  useEffect(() => {
    getSettings()
      .then((next) => {
        const normalized = normalizeLoadedSettings(next)
        // サイドバー effect より先にウォームを開始し、キャッシュヒットを狙う
        if (normalized.activeRepository) {
          prefetchRepo(normalized.activeRepository)
        }
        setSettings(normalized)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoading(false))
  }, [])

  const activateRepo = useCallback(async (path: string) => {
    try {
      setError(null)
      const next = await setActiveRepository(path)
      setSettings(normalizeLoadedSettings(next))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const closeRepo = useCallback(async (path: string) => {
    try {
      setError(null)
      const next = await removeRepository(path)
      setSettings(normalizeLoadedSettings(next))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const addLocalRepo = useCallback(async () => {
    try {
      setError(null)
      const path = await pickDirectory()
      if (!path) {
        return
      }
      const next = await addRepository(path)
      setSettings(normalizeLoadedSettings(next))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const openCloneDialog = useCallback(() => {
    setCloneOpen(true)
  }, [])

  const closeCloneDialog = useCallback(() => {
    if (busy) {
      return
    }
    setCloneOpen(false)
  }, [busy])

  const cloneRepo = useCallback(async (url: string, destPath: string) => {
    try {
      setError(null)
      setBusy(true)
      const next = await cloneRepository(url, destPath)
      setSettings(normalizeLoadedSettings(next))
      setCloneOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [])

  const updateSettings = useCallback(async (next: Settings) => {
    setError(null)
    const saved = await saveSettings(next)
    setSettings(normalizeLoadedSettings(saved))
    return saved
  }, [])

  const updatePushAfterCommit = useCallback(async (repoPath: string, enabled: boolean) => {
    try {
      setError(null)
      const next = await setPushAfterCommit(repoPath, enabled)
      setSettings(normalizeLoadedSettings(next))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const updateMergeAllowFastForward = useCallback(async (repoPath: string, enabled: boolean) => {
    try {
      setError(null)
      const next = await setMergeAllowFastForward(repoPath, enabled)
      setSettings(normalizeLoadedSettings(next))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  return {
    settings,
    repositories: settings.repositories,
    activeRepository: settings.activeRepository,
    loading,
    error,
    busy,
    cloneOpen,
    activateRepo,
    closeRepo,
    addLocalRepo,
    openCloneDialog,
    closeCloneDialog,
    cloneRepo,
    updateSettings,
    updatePushAfterCommit,
    updateMergeAllowFastForward,
  }
}
