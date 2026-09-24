import { describe, expect, test } from "bun:test";
import { contrastRatio, relativeLuminance, theme } from "../app/scene/theme";

describe("contrastRatio", () => {
  test("black on white is 21:1 and a color against itself is 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#5b8f7b", "#5b8f7b")).toBeCloseTo(1);
  });

  test("rejects anything that is not #rrggbb", () => {
    expect(() => relativeLuminance("red")).toThrow();
    expect(() => relativeLuminance("#fff")).toThrow();
  });
});

describe("theme", () => {
  test("card text is readable (at least 4.5:1)", () => {
    expect(contrastRatio(theme.cardText, theme.cardBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.cardMuted, theme.cardBackground)).toBeGreaterThanOrEqual(4.5);
  });

  test("the platform stands out from the floor (at least 3:1)", () => {
    expect(contrastRatio(theme.testPlatform, theme.floor)).toBeGreaterThanOrEqual(3);
  });
});
