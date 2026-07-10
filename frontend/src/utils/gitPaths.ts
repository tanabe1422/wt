import type { FileStatus } from '../types'

/** Display label for a status entry (directories end with `/`). */
export function formatFileStatusPath(entry: FileStatus): string {
  return entry.isDirectory ? `${entry.path}/` : entry.path
}
