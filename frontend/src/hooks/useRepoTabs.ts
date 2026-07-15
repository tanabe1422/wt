import { useCallback, useEffect, useState } from 'react'

import { emptyExternalTool, migrateExternalTool } from '../lib/externalToolPresets'
import { prefetchRepo } from '../lib/repoPrefetch'
import {
  addRepository,
  getSettings,
  pickDirectory,
  removeRepository,
  saveSettings,
  setActiveRepository,
  setPushAfterCommit,
} from '../lib/wails'
import type { Settings } from '../types'

const emptySettings: Settings = {
  repositories: [],
  activeRepository: '',
  diffTool: emptyExternalTool(),
  mergeTool: emptyExternalTool(),
  remoteCleanupExcluded: ['main', 'master', 'develop'],
  pushAfterCommit: {},
}

function normalizeLoadedSettings(settings: Settings): Settings {
  return {
    ...settings,
    repositories: settings.repositories ?? [],
    activeRepository: settings.activeRepository ?? '',
    diffTool: migrateExternalTool({ ...emptyExternalTool(), ...settings.diffTool }),
    mergeTool: migrateExternalTool({ ...emptyExternalTool(), ...settings.mergeTool }),
    remoteCleanupExcluded: settings.remoteCleanupExcluded ?? ['main', 'master', 'develop'],
    pushAfterCommit: settings.pushAfterCommit ?? {},
  }
}

export function useRepoTabs() {
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const addRepo = useCallback(async () => {
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

  return {
    settings,
    repositories: settings.repositories,
    activeRepository: settings.activeRepository,
    loading,
    error,
    activateRepo,
    closeRepo,
    addRepo,
    updateSettings,
    updatePushAfterCommit,
  }
}
