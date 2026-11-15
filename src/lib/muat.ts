import type { Snapshot } from "./jenis";

/** Snapshot terbaru dari cabang `data` (diperbarui GitHub Actions tanpa deploy ulang). */
export const URL_DATA_LIVE = "https://raw.githubusercontent.com/Avalon2222/cyber-attack-map-id/data/ancaman.json";
/** Snapshot bawaan yang ikut di-deploy, dipakai kalau cabang data gak bisa diambil. */
export const URL_DATA_LOKAL = "/data/ancaman.json";

/** Cek minimal supaya JSON rusak/asing gak bikin UI crash. */
export function snapshotValid(x: unknown): x is Snapshot {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<Snapshot>;
  return (
    s.versi === 1 &&
    typeof s.dibuat === "string" &&
    !Number.isNaN(Date.parse(s.dibuat)) &&
    Array.isArray(s.sumber) &&
    Array.isArray(s.host) &&
    Array.isArray(s.tren) &&
    !!s.masuk &&
    Array.isArray(s.masuk.aliran)
  );
}

/** Pilih snapshot paling baru di antara kandidat yang valid. */
export function pilihTerbaru(kandidat: unknown[]): Snapshot | null {
  let terbaik: Snapshot | null = null;
  for (const k of kandidat) {
    if (!snapshotValid(k)) continue;
    if (!terbaik || Date.parse(k.dibuat) > Date.parse(terbaik.dibuat)) terbaik = k;
  }
  return terbaik;
}

async function ambilJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function muatSnapshot(): Promise<Snapshot | null> {
  const [live, lokal] = await Promise.all([ambilJson(URL_DATA_LIVE), ambilJson(URL_DATA_LOKAL)]);
  return pilihTerbaru([live, lokal]);
}
