import { useState } from 'react'

export function useTreeExpansion(depth: number, threshold = 1) {
  return useState(depth < threshold)
}
