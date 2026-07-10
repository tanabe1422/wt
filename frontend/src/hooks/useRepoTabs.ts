import { useCallback, useEffect, useState } from 'react'

import {
  addRepository,
  getSettings,
  pickDirectory,
  removeRepository,
  setActiveRepository,
} from '../lib/wails'
import type { Settings } from '../types'

const emptySettings: Settings = {
  repositories: [],
  activeRepository: '',
}

export function useRepoTabs() {
  const [settings, setSettings] = useState<Settings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoading(false))
  }, [])

  const activateRepo = useCallback(async (path: string) => {
    try {
      setError(null)
      const next = await setActiveRepository(path)
      setSettings(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const closeRepo = useCallback(async (path: string) => {
    try {
      setError(null)
      const next = await removeRepository(path)
      setSettings(next)
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
      setSettings(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  return {
    repositories: settings.repositories,
    activeRepository: settings.activeRepository,
    loading,
    error,
    activateRepo,
    closeRepo,
    addRepo,
  }
}
