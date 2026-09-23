// Isometric view: the camera looks down the cube diagonal, so the three
// axes are foreshortened equally.
export const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
export const ISO_AZIMUTH = Math.PI / 4;

export const ZOOM_LIMITS = { min: 0.6, max: 3 } as const;

export type Frustum = { left: number; right: number; top: number; bottom: number };

// The shorter side of the window always shows `viewSize` world units, so a
// tall phone screen never crops the scene sideways.
export function frustumFor(aspect: number, viewSize: number): Frustum {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error(`invalid aspect: ${aspect}`);
  if (!Number.isFinite(viewSize) || viewSize <= 0) throw new Error(`invalid view size: ${viewSize}`);
  const halfHeight = aspect >= 1 ? viewSize / 2 : viewSize / 2 / aspect;
  const halfWidth = halfHeight * aspect;
  return { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight };
}

export function isoOffset(distance: number): [number, number, number] {
  const horizontal = distance * Math.cos(ISO_ELEVATION);
  return [
    horizontal * Math.sin(ISO_AZIMUTH),
    distance * Math.sin(ISO_ELEVATION),
    horizontal * Math.cos(ISO_AZIMUTH),
  ];
}

export function clampPixelRatio(dpr: number): number {
  return Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, 2) : 1;
}
