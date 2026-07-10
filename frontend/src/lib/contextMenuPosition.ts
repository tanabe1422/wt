/** Initial position for a portaled `position: fixed` context menu. */
export function toContextMenuPosition(
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return { x: clientX, y: clientY }
}

/** Clamp a portaled context menu within the viewport. */
export function computeContextMenuPosition(
  clientX: number,
  clientY: number,
  menuWidth: number,
  menuHeight: number,
  margin = 8,
): { x: number; y: number } {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  let top = clientY
  if (top + menuHeight > viewportH - margin) {
    top = clientY - menuHeight
  }
  top = Math.max(margin, Math.min(top, viewportH - menuHeight - margin))

  let left = clientX
  if (left + menuWidth > viewportW - margin) {
    left = clientX - menuWidth
  }
  left = Math.max(margin, Math.min(left, viewportW - menuWidth - margin))

  return { x: left, y: top }
}
