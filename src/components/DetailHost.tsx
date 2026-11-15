"use client";

import { X } from "lucide-react";
import type { HostID } from "@/lib/jenis";
import { labelKategori, t, type Lang } from "@/lib/i18n";
import { WARNA } from "@/lib/warna";
import { relatif } from "@/lib/waktu";

export default function DetailHost({ host, lang, sekarang, onTutup }: { host: HostID; lang: Lang; sekarang: number; onTutup: () => void }) {
  const warna = WARNA[host.kategori];
  return (
    <div className="kaca braket w-[280px] max-w-[calc(100vw-24px)] p-3" role="dialog" aria-label={host.ip} data-testid="detail-host">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: warna }}>
            {labelKategori(host.kategori, lang)}
          </div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums">{host.ip}</div>
        </div>
        <button className="tombol-ikon h-7 w-7" onClick={onTutup} aria-label={t("tutup", lang)}>
          <X size={14} />
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[11.5px]">
        <dt className="text-muted">{lang === "id" ? "Lokasi" : "Location"}</dt>
        <dd>{host.kota}</dd>
        {host.asn ? (
          <>
            <dt className="text-muted">ASN</dt>
            <dd>AS{host.asn}</dd>
          </>
        ) : null}
        <dt className="text-muted">{t("subnet", lang)}</dt>
        <dd className="tabular-nums">{host.jumlah}</dd>
        <dt className="text-muted">{t("terakhir", lang)}</dt>
        <dd>{relatif(host.waktu, sekarang, lang)}</dd>
        {host.rinci ? (
          <>
            <dt className="text-muted">Info</dt>
            <dd className="break-words">{host.rinci}</dd>
          </>
        ) : null}
        <dt className="text-muted">{t("sumber", lang)}</dt>
        <dd>{host.sumber}</dd>
      </dl>
    </div>
  );
}
