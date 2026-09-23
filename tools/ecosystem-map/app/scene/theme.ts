// "Digital forge" palette: cyan carries information and memory, ember carries
// work in progress. Everything else stays near-black so both can glow.
export const theme = {
  background: "#05070b",
  floor: "#0a0d13",
  gridMinor: "#1c2a36",
  gridMajor: "#2b4152",
  gridCross: "#5fa8c8",
  platformSide: "#121722",
  platformTop: "#0e131b",
  testPlatform: "#38d6f5",
  memory: "#38d6f5",
  forge: "#ff8a3d",
  dust: "#9fdcff",
  cardBackground: "#0f141d",
  cardBorder: "#23465a",
  cardText: "#e6f1f7",
  cardMuted: "#8ea3b3",
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
