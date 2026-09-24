// Small pure helpers for pointer input and camera motion.

// Pixels the pointer may move between press and release and still count as a
// click; anything further is a drag that pans the map.
export const CLICK_SLOP = 5;

export type Point = { x: number; y: number };

export function isClick(down: Point, up: Point, slop = CLICK_SLOP): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= slop;
}

// Smooth start and end for camera flights; `t` is clamped to 0..1.
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
