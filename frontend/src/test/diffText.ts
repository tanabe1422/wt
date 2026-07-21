import { screen } from '@testing-library/react'

/** Diff 行テキストは半角スペースを · span に分割するため、通常の getByText では取れない。 */
export function getByDiffLineText(text: string) {
  return screen.getByText((_, node) => {
    if (!node || node.textContent !== text) {
      return false
    }
    return Array.from(node.children).every((child) => child.textContent !== text)
  })
}
