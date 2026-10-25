/** FNV-1a 32-bit hash — stable across runs/platforms, used to seed generated artwork. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). Returns a function yielding floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length] as T;
}

/** A useId() value made safe for SVG `url(#id)` references. */
export function svgId(reactId: string, suffix: string): string {
  return `pp${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${suffix}`;
}
