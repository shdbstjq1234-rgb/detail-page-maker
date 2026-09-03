"use client";

/**
 * 상품 이미지에서 실제 색을 뽑아낸다 (브라우저 canvas).
 *
 * 단순히 "가장 많은 픽셀 색"을 쓰면 배경(흰색)만 나오므로:
 *  - 가장자리 픽셀을 배경으로 간주해 제외
 *  - 무채색/극단 밝기 픽셀은 후보에서 감점
 *  - HSV 버킷으로 군집화해 채도 가중 상위 색을 고른다
 */
import { hexToHsl, hslToHex, type ProductColors } from "./color-direction";

const SIZE = 96; // 축소 샘플링 크기

export async function extractProductColors(src: string): Promise<ProductColors | null> {
  try {
    const img = await loadImage(src);
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

    // 가장자리 색 = 배경으로 추정
    const edge = averageEdge(data);

    // hue(24) × sat(3) × light(3) 버킷
    const buckets = new Map<string, { n: number; r: number; g: number; b: number; w: number }>();
    let sumL = 0;
    let sumS = 0;
    let warm = 0;
    let cool = 0;
    let counted = 0;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const a = data[i + 3];
        if (a < 200) continue; // 투명(누끼) 영역 제외
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 배경색과 거의 같으면 제외
        if (dist(r, g, b, edge) < 26) continue;

        const { h, s, l } = rgbToHsl(r, g, b);
        counted++;
        sumL += l;
        sumS += s;
        if (h < 70 || h > 300) warm++;
        else cool++;

        // 극단 밝기(거의 흰/검)는 대표색 후보에서 약하게
        const w = s < 8 ? 0.12 : l > 95 || l < 6 ? 0.15 : 0.4 + (s / 100) * 0.6;
        const key = `${Math.floor(h / 15)}_${Math.floor(s / 34)}_${Math.floor(l / 34)}`;
        const prev = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, w: 0 };
        prev.n++;
        prev.r += r;
        prev.g += g;
        prev.b += b;
        prev.w += w;
        buckets.set(key, prev);
      }
    }
    if (!counted || !buckets.size) return null;

    const ranked = [...buckets.values()]
      .map((v) => ({ hex: rgbHex(v.r / v.n, v.g / v.n, v.b / v.n), score: v.w, n: v.n }))
      .sort((a, b) => b.score - a.score);

    const dominant = ranked[0].hex;
    const domH = hexToHsl(dominant).h;
    // 색상환에서 충분히 떨어진 두 번째 색
    const secondary = ranked.find((x) => hueGap(hexToHsl(x.hex).h, domH) > 25)?.hex ?? ranked[1]?.hex;
    // 가장 채도 높은 색 = 액센트 후보
    const accent = [...ranked].sort((a, b) => hexToHsl(b.hex).s - hexToHsl(a.hex).s)[0]?.hex;
    const neutral = rgbHex(edge[0], edge[1], edge[2]);

    return {
      dominant,
      secondary,
      accent,
      neutral,
      brightness: Math.round(sumL / counted),
      saturation: Math.round(sumS / counted),
      temperature: Math.round(((warm - cool) / Math.max(1, warm + cool)) * 100),
    };
  } catch {
    return null;
  }
}

/** 여러 장에서 뽑아 가장 채도가 뚜렷한 결과를 쓴다 */
export async function extractFromImages(urls: string[]): Promise<ProductColors | null> {
  const out: ProductColors[] = [];
  for (const u of urls.slice(0, 3)) {
    const r = await extractProductColors(u);
    if (r) out.push(r);
  }
  if (!out.length) return null;
  return out.sort((a, b) => b.saturation - a.saturation)[0];
}

/** 팔레트 미리보기용 — 색을 살짝 밝게/어둡게 */
export function shade(hex: string, dl: number): string {
  const h = hexToHsl(hex);
  return hslToHex({ ...h, l: Math.max(0, Math.min(100, h.l + dl)) });
}

// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function averageEdge(data: Uint8ClampedArray): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const push = (i: number) => {
    if (data[i + 3] < 200) return;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  };
  for (let x = 0; x < SIZE; x++) {
    push((0 * SIZE + x) * 4);
    push(((SIZE - 1) * SIZE + x) * 4);
  }
  for (let y = 0; y < SIZE; y++) {
    push((y * SIZE + 0) * 4);
    push((y * SIZE + (SIZE - 1)) * 4);
  }
  if (!n) return [255, 255, 255];
  return [r / n, g / n, b / n];
}

function dist(r: number, g: number, b: number, e: [number, number, number]) {
  return Math.sqrt((r - e[0]) ** 2 + (g - e[1]) ** 2 + (b - e[2]) ** 2);
}

function rgbHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r0: number, g0: number, b0: number) {
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hueGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
