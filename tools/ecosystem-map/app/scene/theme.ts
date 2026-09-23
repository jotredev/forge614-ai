export const theme = {
  background: "#1b1e27",
  floor: "#232733",
  floorLine: "#5d7390",
  platformSide: "#1f222c",
  testPlatform: "#5b8f7b",
  cardBackground: "#262a36",
  cardBorder: "#3a4052",
  cardText: "#e8e6df",
  cardMuted: "#9aa0b0",
} as const;

export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`invalid hex color: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
