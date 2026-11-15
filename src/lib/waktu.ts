/** Format waktu untuk UI. Zona tampilan: WIB (Asia/Jakarta). */

export type Lang = "id" | "en";

export function jamWib(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
}

export function tanggalPendek(iso: string, lang: Lang): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(d);
}

/** "3 jam lalu" / "3 hours ago" */
export function relatif(iso: string | undefined, sekarang: number, lang: Lang): string {
  if (!iso) return "–";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "–";
  const detik = Math.max(0, Math.round((sekarang - t) / 1000));
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (detik < 60) return rtf.format(-detik, "second");
  const menit = Math.round(detik / 60);
  if (menit < 60) return rtf.format(-menit, "minute");
  const jam = Math.round(menit / 60);
  if (jam < 48) return rtf.format(-jam, "hour");
  return rtf.format(-Math.round(jam / 24), "day");
}

export function angka(n: number, lang: Lang, digit = 0): string {
  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", { maximumFractionDigits: digit, minimumFractionDigits: digit }).format(n);
}
