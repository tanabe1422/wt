import type { ExternalTool, ExternalToolPreset } from '../types'

export interface ToolPresetOption {
  id: ExternalToolPreset
  label: string
  diffArgs: string
  mergeArgs: string
  pathHints: string[]
}

export const TOOL_PRESETS: ToolPresetOption[] = [
  {
    id: 'vscode',
    label: 'VS Code',
    diffArgs: '--wait --diff $LOCAL $REMOTE',
    mergeArgs: '--wait --merge $REMOTE $LOCAL $BASE $MERGED',
    pathHints: ['code', 'code.cmd'],
  },
  {
    id: 'winmerge',
    label: 'WinMerge',
    // Use -flags (not /flags): git mergetool runs via MSYS sh, which converts /e → E:\
    diffArgs: '-e -u -wl "$LOCAL" "$REMOTE"',
    mergeArgs: '-e -u "$LOCAL" "$BASE" "$REMOTE" -o "$MERGED"',
    pathHints: [
      'C:\\Program Files\\WinMerge\\WinMergeU.exe',
      'C:\\Program Files (x86)\\WinMerge\\WinMergeU.exe',
    ],
  },
  {
    id: 'beyondcompare',
    label: 'Beyond Compare',
    diffArgs: '$LOCAL $REMOTE',
    mergeArgs: '$LOCAL $REMOTE $BASE $MERGED',
    pathHints: [
      'C:\\Program Files\\Beyond Compare 5\\BCompare.exe',
      'C:\\Program Files\\Beyond Compare 4\\BCompare.exe',
      'C:\\Program Files (x86)\\Beyond Compare 4\\BCompare.exe',
    ],
  },
  {
    id: 'custom',
    label: 'カスタム',
    diffArgs: '',
    mergeArgs: '',
    pathHints: [],
  },
]

export function emptyExternalTool(): ExternalTool {
  return { preset: 'custom', path: '', args: '' }
}

/** Fix WinMerge args saved with /flags (broken under git's MSYS shell). */
export function migrateExternalTool(tool: ExternalTool): ExternalTool {
  const preset = tool.preset || 'custom'
  if (preset !== 'winmerge') {
    return { ...emptyExternalTool(), ...tool, preset }
  }
  const args = tool.args ?? ''
  if (!/(^|\s)\/[a-zA-Z]/.test(args)) {
    return { ...emptyExternalTool(), ...tool, preset }
  }
  const kind = args.includes('$BASE') || args.includes('$MERGED') ? 'merge' : 'diff'
  const defaults = TOOL_PRESETS.find((item) => item.id === 'winmerge')!
  return {
    preset: 'winmerge',
    path: tool.path,
    args: kind === 'merge' ? defaults.mergeArgs : defaults.diffArgs,
  }
}

export function applyPreset(
  kind: 'diff' | 'merge',
  presetId: ExternalToolPreset,
  current: ExternalTool,
): ExternalTool {
  const preset = TOOL_PRESETS.find((item) => item.id === presetId) ?? TOOL_PRESETS[3]
  const args = kind === 'diff' ? preset.diffArgs : preset.mergeArgs
  const hintPath = preset.pathHints[0] ?? ''
  return {
    preset: preset.id,
    path: current.path.trim() || hintPath,
    args,
  }
}
