// Genera la textura de mármol blanco con vetas grises sutiles.
// El tile es periódico (sin costuras) y grande para que la repetición no se perciba.
// Uso: node scripts/generate-marble.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const S = 1400;
const G = 64; // celdas de la rejilla de ruido (periódica)

function makeNoise(seed) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grid = new Float32Array(G * G).map(() => rnd());
  const at = (x, y) => grid[((y % G) + G) % G * G + (((x % G) + G) % G)];
  const fade = (t) => t * t * (3 - 2 * t);
  // Ruido de valor periódico con período "per" celdas (divisor de G).
  return (x, y, per) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = fade(x - x0), fy = fade(y - y0);
    const w = (a) => ((a % per) + per) % per;
    const a = at(w(x0), w(y0)), b = at(w(x0 + 1), w(y0));
    const c = at(w(x0), w(y0 + 1)), d = at(w(x0 + 1), w(y0 + 1));
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbm(noise, u, v, baseCells, octaves) {
  let sum = 0, amp = 0.5, norm = 0, cells = baseCells;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(u * cells, v * cells, cells);
    norm += amp; amp *= 0.5; cells *= 2;
  }
  return sum / norm;
}

const n1 = makeNoise(11), n2 = makeNoise(97), n3 = makeNoise(431);
const buf = Buffer.alloc(S * S * 3);

for (let y = 0; y < S; y++) {
  const v = y / S;
  for (let x = 0; x < S; x++) {
    const u = x / S;
    // Vetas principales: diagonales, deformadas por turbulencia.
    const t1 = fbm(n1, u, v, 2, 4);
    const p1 = u * 2 + v * 1 + t1 * 2.2;
    const s1 = 1 - Math.abs(Math.sin(p1 * Math.PI));
    const vein1 = Math.pow(s1, 40) + Math.pow(s1, 7) * 0.22;
    // Vetas secundarias más finas en otra dirección.
    const t2 = fbm(n2, u, v, 2, 5);
    const p2 = u * -1 + v * 3 + t2 * 1.8;
    const vein2 = Math.pow(1 - Math.abs(Math.sin(p2 * Math.PI)), 70);
    // Nube suave para dar profundidad.
    const cloud = fbm(n3, u, v, 2, 4);
    const shade = 3 + cloud * 6 + vein1 * 30 + vein2 * 14;
    const i = (y * S + x) * 3;
    buf[i] = 255 - shade;          // ligeramente frío
    buf[i + 1] = 255 - shade;
    buf[i + 2] = 255 - shade * 0.86;
  }
}

mkdirSync('public/textures', { recursive: true });
const img = sharp(await sharp(buf, { raw: { width: S, height: S, channels: 3 } }).blur(0.7).toBuffer(), { raw: { width: S, height: S, channels: 3 } });
await img.clone().webp({ quality: 70, effort: 6 }).toFile('public/textures/marble.webp');
await img.clone().resize(700).jpeg({ quality: 80 }).toFile('scripts/.marble-preview.jpg');
console.log('ok');
