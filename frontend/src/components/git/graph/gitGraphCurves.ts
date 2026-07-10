export function getCurveTop(x1: number, y1: number, x2: number, y2: number): string {
  const bend = Math.min(15, Math.abs(y2 - y1) / 2)
  let path = ` C ${x1} ${y1 + bend}, ${x2} ${y1 + bend}, ${x2} ${y1 + bend * 2}`
  if (y1 + bend * 2 < y2) {
    path += ` L ${x2} ${y2}`
  }
  return path
}

export function getCurveBottom(x1: number, y1: number, x2: number, y2: number): string {
  const bend = Math.min(15, Math.abs(y2 - y1) / 2)
  let path = ''
  if (y2 - bend * 2 > y1) {
    path += ` L ${x1} ${y2 - bend * 2}`
  }
  path += ` C ${x1} ${y2 - bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`
  return path
}
