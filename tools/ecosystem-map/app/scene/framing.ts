import * as THREE from "three";
import { ZOOM_LIMITS, frustumFor } from "./iso-camera";

// Where the camera should look, and how close, so everything on the map fits
// the screen and sits in the middle of the free area (below the top bar and
// clear of the corners reserved for other things). It measures the real
// content instead of using fixed numbers, so it also works on a narrow phone
// or a very wide window.

export type View = { target: THREE.Vector3; zoom: number };

export type Padding = { left: number; right: number; top: number; bottom: number };

export type FitInput = {
  camera: THREE.OrthographicCamera;
  // 3D points that must be inside the view: plate corners and the spot of
  // each floating title.
  points: THREE.Vector3[];
  width: number;
  height: number;
  viewSize: number;
  // Pixels to keep free at each side of the screen.
  pad: Padding;
  // The closest it may zoom in; there is no point in filling a huge window.
  maxZoom?: number;
  // The farthest it may zoom out. Below this the titles pile up and cannot
  // be read, so on a narrow screen the content is centered but not all of it
  // fits, and the person pans.
  minZoom?: number;
};

export function fitView({ camera, points, width, height, viewSize, pad, maxZoom, minZoom }: FitInput, current: View): View {
  if (points.length === 0) return current;
  camera.updateMatrixWorld(true);

  // Size of the content on the picture plane, in world units.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    const seen = point.clone().applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, seen.x);
    maxX = Math.max(maxX, seen.x);
    minY = Math.min(minY, seen.y);
    maxY = Math.max(maxY, seen.y);
  }

  const frustum = frustumFor(width / height, viewSize);
  const perPixel = (frustum.top - frustum.bottom) / height; // world units per pixel at zoom 1
  const freeWidth = Math.max(1, width - pad.left - pad.right);
  const freeHeight = Math.max(1, height - pad.top - pad.bottom);
  const wanted = Math.min((freeWidth * perPixel) / Math.max(1e-6, maxX - minX), (freeHeight * perPixel) / Math.max(1e-6, maxY - minY));
  const zoom = THREE.MathUtils.clamp(wanted, Math.max(minZoom ?? ZOOM_LIMITS.min, ZOOM_LIMITS.min), Math.min(maxZoom ?? ZOOM_LIMITS.max, ZOOM_LIMITS.max));

  // Move the camera so the content's middle lands in the middle of the free
  // area, which is off the screen's middle by half the difference of padding.
  const unit = perPixel / zoom;
  const offsetX = (pad.left - pad.right) / 2;
  const offsetY = (pad.top - pad.bottom) / 2;
  const shiftX = (minX + maxX) / 2 - offsetX * unit;
  const shiftY = (minY + maxY) / 2 + offsetY * unit;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  return { target: current.target.clone().addScaledVector(right, shiftX).addScaledVector(up, shiftY), zoom };
}
