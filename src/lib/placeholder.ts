// Deterministic placeholder look for an image slot, shared by DOM and WebGL.

const PAIRS: [string, string][] = [
  ["#C9A891", "#D8B4A6"], // clay → rose
  ["#E3D5C6", "#C9A891"], // latte → clay
  ["#D8B4A6", "#F5EFE8"], // rose → cream
  ["#F5EFE8", "#C9A891"], // cream → clay
  ["#E3D5C6", "#D8B4A6"], // latte → rose
  ["#C9A891", "#E3D5C6"], // clay → latte
];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function placeholderFor(id: string) {
  const h = hash(id);
  const [a, b] = PAIRS[h % PAIRS.length];
  return {
    a,
    b,
    /** gradient angle in degrees */
    angle: (h >> 8) % 360,
    /** 0..1, used to vary the shader noise */
    seed: ((h >> 16) % 1000) / 1000,
    label: id.replace(/^img-/i, "IMG ").toUpperCase(),
  };
}
