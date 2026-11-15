"use client";

import type { Kategori } from "@/lib/jenis";
import { t, type Lang } from "@/lib/i18n";
import { WARNA } from "@/lib/warna";
import { Bagian } from "./Bagian";

export interface Kejadian {
  id: string;
  jenis: "ping" | "busur";
  kategori: Kategori;
  /** label waktu siap tampil (waktu asli indikator), atau kosong untuk busur sampel */
  waktu: string;
  teks: string;
  sub: string;
}

const KODE: Record<Kategori, string> = {
  ddos: "DDOS",
  web: "WEB",
  bruteforce: "BRUTE",
  malware: "MALW",
  botnet: "C2",
  scan: "SCAN",
  spam: "SPAM",
  laporan: "ABUSE",
};

export default function FeedLive({ kejadian, lang, ringkas = false }: { kejadian: Kejadian[]; lang: Lang; ringkas?: boolean }) {
  return (
    <Bagian judul={t("feed_judul", lang)} sub={ringkas ? undefined : t("feed_sub", lang)} kanan={<span className="kedip mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />}>
      <ol className="space-y-[3px] font-mono text-[11px]" aria-live="off" data-testid="feed">
        {kejadian.map((k) => (
          <li key={k.id} className="baris-masuk grid grid-cols-[44px_44px_minmax(0,1fr)] gap-x-1.5 leading-[1.35]">
            <span className="tabular-nums text-dim">{k.waktu || "SMPL"}</span>
            <span className="font-bold" style={{ color: WARNA[k.kategori] }}>
              {KODE[k.kategori]}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-teks">{k.teks}</span>
              <span className="block truncate text-[10px] text-muted">{k.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </Bagian>
  );
}
