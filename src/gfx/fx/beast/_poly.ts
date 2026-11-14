// Shared polygon raster helpers for the Beastmaster silhouettes (hawk dive, boar charge, stampede).
// The silhouettes are filled by testing every pixel of a ~100x100 box against ~30 polygons per animal per frame,
// so the even-odd test sits in the hottest loop of the bake. A bounding-box reject first skips the polygons a pixel
// cannot be inside (most of them), with exactly the same result as testing every polygon.

export type Pt = [number, number]

/** Axis-aligned bounds of a polygon: [minX, minY, maxX, maxY]. */
export type Box = [number, number, number, number]

export function bbox(pts: Pt[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return [x0, y0, x1, y1]
}

/** Even-odd point-in-polygon test. */
export function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

/**
 * `inside` behind a bounding-box reject. Outside the box the even-odd test is always false (no edge spans the
 * point's row, or every crossing lies left of it, or the ray crosses the closed outline an even number of times).
 */
export function insideBox(pts: Pt[], b: Box, x: number, y: number): boolean {
  if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false
  return inside(pts, x, y)
}
