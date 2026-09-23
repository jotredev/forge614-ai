import { describe, expect, test } from "bun:test";
import { ISO_ELEVATION, ZOOM_LIMITS, clampPixelRatio, frustumFor, isoOffset } from "../app/scene/iso-camera";

describe("frustumFor", () => {
  test("wide window keeps the full view size vertically", () => {
    const f = frustumFor(16 / 9, 24);
    expect(f.top).toBeCloseTo(12);
    expect(f.bottom).toBeCloseTo(-12);
    expect(f.right).toBeCloseTo(12 * (16 / 9));
  });

  test("tall phone window keeps the full view size horizontally", () => {
    const f = frustumFor(0.46, 24);
    expect(f.right - f.left).toBeCloseTo(24);
    expect(f.top - f.bottom).toBeGreaterThan(24);
  });

  test("width divided by height always equals the aspect, so nothing stretches", () => {
    for (const aspect of [0.46, 1, 1.6, 2.4]) {
      const f = frustumFor(aspect, 24);
      expect((f.right - f.left) / (f.top - f.bottom)).toBeCloseTo(aspect);
    }
  });

  test("rejects impossible sizes", () => {
    expect(() => frustumFor(0, 24)).toThrow();
    expect(() => frustumFor(Number.NaN, 24)).toThrow();
    expect(() => frustumFor(1.5, 0)).toThrow();
  });
});

describe("isoOffset", () => {
  test("sits on the isometric diagonal at the requested distance", () => {
    const [x, y, z] = isoOffset(10);
    expect(Math.hypot(x, y, z)).toBeCloseTo(10);
    expect(x).toBeCloseTo(z);
    expect(Math.asin(y / 10)).toBeCloseTo(ISO_ELEVATION);
  });
});

describe("clampPixelRatio", () => {
  test("caps dense screens at 2 and falls back to 1 on garbage", () => {
    expect(clampPixelRatio(3)).toBe(2);
    expect(clampPixelRatio(1.5)).toBe(1.5);
    expect(clampPixelRatio(Number.NaN)).toBe(1);
    expect(clampPixelRatio(0)).toBe(1);
  });
});

describe("ZOOM_LIMITS", () => {
  test("allows zooming out a little and in up to 3x", () => {
    expect(ZOOM_LIMITS.min).toBeGreaterThan(0.4);
    expect(ZOOM_LIMITS.min).toBeLessThan(1);
    expect(ZOOM_LIMITS.max).toBe(3);
  });
});
