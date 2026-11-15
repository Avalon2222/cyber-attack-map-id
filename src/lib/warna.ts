import type { Kategori } from "./jenis";

/** Warna per kategori: neon di atas latar gelap, cukup beda satu sama lain (merah, oranye, kuning, magenta, ungu, cyan, hijau, putih). */
export const WARNA: Record<Kategori, string> = {
  ddos: "#ff3355",
  web: "#ff8a1f",
  bruteforce: "#ffd60a",
  malware: "#ff2bd6",
  botnet: "#9b6bff",
  scan: "#22e3ff",
  spam: "#3dffa2",
  laporan: "#e6edf7",
};

/** hex #rrggbb -> rgba(r,g,b,a) */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
