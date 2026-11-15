"use client";

import type { Snapshot } from "@/lib/jenis";
import { labelKategori, t, type Lang } from "@/lib/i18n";
import { angka } from "@/lib/waktu";
import { WARNA } from "@/lib/warna";
import { Bagian, Batang } from "./Bagian";

export default function PanelHost({ snapshot, lang }: { snapshot: Snapshot; lang: Lang }) {
  const total = snapshot.kategori.reduce((s, k) => s + k.jumlah, 0);
  const maksKat = Math.max(1, ...snapshot.kategori.map((k) => k.jumlah));
  const kota = snapshot.kota.slice(0, 5);
  const maksKota = Math.max(1, ...kota.map((k) => k.jumlah));
  const asn = snapshot.asn.slice(0, 5);
  const maksAsn = Math.max(1, ...asn.map((a) => a.jumlah));

  return (
    <>
      <Bagian judul={t("host_judul", lang)} sub={t("host_sub", lang)}>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none text-accent tabular-nums" data-testid="total-host">
            {angka(total, lang)}
          </span>
          <span className="text-[11px] text-muted">IP</span>
        </div>
        <ul>
          {snapshot.kategori.map((k) => (
            <Batang
              key={k.kategori}
              label={
                <>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: WARNA[k.kategori] }} />
                  {labelKategori(k.kategori, lang)}
                </>
              }
              nilai={angka(k.jumlah, lang)}
              persen={(100 * k.jumlah) / maksKat}
              warna={WARNA[k.kategori]}
            />
          ))}
        </ul>
      </Bagian>
      {kota.length ? (
        <Bagian judul={t("kota_top", lang)} className="border-t border-[var(--border)]">
          <ul>
            {kota.map((k) => (
              <Batang key={k.kota} label={k.kota} nilai={angka(k.jumlah, lang)} persen={(100 * k.jumlah) / maksKota} warna="#22e3ff" />
            ))}
          </ul>
        </Bagian>
      ) : null}
      {asn.length ? (
        <Bagian judul={t("asn_top", lang)} className="border-t border-[var(--border)]">
          <ul>
            {asn.map((a) => (
              <Batang
                key={a.asn}
                label={
                  <>
                    <span className="text-dim">AS{a.asn}</span> {a.nama}
                  </>
                }
                nilai={angka(a.jumlah, lang)}
                persen={(100 * a.jumlah) / maksAsn}
                warna="#9b6bff"
              />
            ))}
          </ul>
        </Bagian>
      ) : null}
    </>
  );
}
