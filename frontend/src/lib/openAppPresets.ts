import type { OpenApp, OpenAppIcon } from '../types'

export interface OpenAppPreset {
  id: OpenAppIcon
  label: string
  name: string
  path: string
  args: string
}

export const OPEN_APP_PRESETS: OpenAppPreset[] = [
  { id: 'cursor', label: 'Cursor', name: 'Cursor', path: 'cursor', args: '{path}' },
  { id: 'zed', label: 'Zed', name: 'Zed', path: 'zed', args: '{path}' },
  { id: 'vscode', label: 'VS Code', name: 'VS Code', path: 'code', args: '{path}' },
]

export function createOpenAppId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return `app${Date.now().toString(36)}`
}

export function createBlankOpenApp(): OpenApp {
  return {
    id: createOpenAppId(),
    name: '',
    path: '',
    args: '{path}',
    icon: 'generic',
  }
}

export function createPresetOpenApp(preset: OpenAppPreset): OpenApp {
  return {
    id: createOpenAppId(),
    name: preset.name,
    path: preset.path,
    args: preset.args,
    icon: preset.id,
  }
}
