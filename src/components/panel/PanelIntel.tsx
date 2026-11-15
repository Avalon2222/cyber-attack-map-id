"use client";

import type { Snapshot } from "@/lib/jenis";
import { t, type Lang } from "@/lib/i18n";
import { ANGKA_BSSN } from "@/lib/bssn";
import { angka, tanggalPendek } from "@/lib/waktu";
import { Bagian, Batang } from "./Bagian";

function formatBesar(n: number, lang: Lang): string {
  if (n >= 1e9) return `${angka(n / 1e9, lang, 2)} ${lang === "id" ? "miliar" : "billion"}`;
  if (n >= 1e6) return `${angka(n / 1e6, lang, 1)} ${lang === "id" ? "juta" : "million"}`;
  return angka(n, lang);
}

export function PanelGlobal({ snapshot, lang }: { snapshot: Snapshot; lang: Lang }) {
  const port = snapshot.globalPort.slice(0, 6);
  const maks = Math.max(1, ...port.map((p) => p.record));
  const r = snapshot.peringkatID;
  return (
    <Bagian judul={t("global_judul", lang)} sub={t("global_sub", lang)}>
      {r && r.posisi > 0 ? (
        <p className="mb-2.5 text-[12px] leading-snug">
          {t("peringkat", lang)} <span className="font-bold text-accent">#{r.posisi}</span> {t("dari", lang)} {r.dari} {t("negara", lang)}
          <span className="text-muted">
            {" "}
            · {angka(r.jumlah, lang)} IP · {r.sumber}
          </span>
        </p>
      ) : null}
      {port.length ? (
        <>
          <div className="label-kecil mb-1">{t("port_top", lang)}</div>
          <ul>
            {port.map((p) => (
              <Batang
                key={p.port}
                label={
                  <>
                    <span className="text-dim tabular-nums">{p.port}</span> {p.layanan}
                  </>
                }
                nilai={formatBesar(p.record, lang)}
                persen={(100 * p.record) / maks}
                warna="#22e3ff"
              />
            ))}
          </ul>
        </>
      ) : null}
    </Bagian>
  );
}

export function PanelKampanye({ snapshot, lang }: { snapshot: Snapshot; lang: Lang }) {
  const k = snapshot.kampanye.slice(0, 8);
  return (
    <Bagian judul={t("kampanye_judul", lang)} sub="AlienVault OTX">
      {k.length ? (
        <ul className="space-y-2">
          {k.map((p) => (
            <li key={p.id} className="text-[11.5px] leading-snug">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="tautan line-clamp-2">
                {p.judul}
              </a>
              <div className="mt-0.5 text-[10.5px] text-muted">
                {tanggalPendek(p.tanggal, lang)}
                {p.aktor ? ` · ${p.aktor}` : ""}
                {p.malware.length ? ` · ${p.malware.join(", ")}` : ""}
                {p.industri.length ? ` · ${p.industri.join(", ")}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted">{t("kampanye_kosong", lang)}</p>
      )}
    </Bagian>
  );
}

export function PanelRansomware({ snapshot, lang, sekarang }: { snapshot: Snapshot; lang: Lang; sekarang: number }) {
  const data = snapshot.ransomware;
  const setahun = data.filter((d) => sekarang - Date.parse(d.tanggal) < 365 * 86_400_000);
  const perSektor = new Map<string, number>();
  for (const d of setahun) perSektor.set(d.sektor, (perSektor.get(d.sektor) ?? 0) + 1);
  const sektor = [...perSektor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maks = Math.max(1, ...sektor.map((s) => s[1]));
  return (
    <Bagian judul={t("ransom_judul", lang)} sub={t("ransom_sub", lang)}>
      {data.length ? (
        <>
          <p className="mb-2 text-[12px]">
            <span className="font-bold text-accent">{angka(setahun.length, lang)}</span>{" "}
            <span className="text-muted">{lang === "id" ? "klaim dalam 12 bulan terakhir" : "claims in the last 12 months"}</span>
          </p>
          <ul className="mb-2">
            {sektor.map(([s, n]) => (
              <Batang key={s} label={s} nilai={angka(n, lang)} persen={(100 * n) / maks} warna="#ff2e4d" />
            ))}
          </ul>
          <ul className="space-y-0.5 text-[10.5px] text-muted">
            {data.slice(0, 5).map((d, i) => (
              <li key={`${d.tanggal}-${i}`} className="truncate">
                {tanggalPendek(d.tanggal, lang)} · <span className="text-teks">{d.grup}</span> · {d.sektor}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[11px] text-muted">{t("ransom_kosong", lang)}</p>
      )}
    </Bagian>
  );
}

export function PanelBssn({ lang }: { lang: Lang }) {
  return (
    <Bagian judul={t("bssn_judul", lang)} sub={t("bssn_sub", lang)}>
      <ul className="space-y-1.5">
        {ANGKA_BSSN.map((a) => (
          <li key={a.periode.en} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 text-[11.5px]">
            <span className="text-muted">{a.periode[lang]}</span>
            <a href={a.sumber} target="_blank" rel="noopener noreferrer" className="tautan text-right tabular-nums">
              {formatBesar(a.anomali, lang)}
            </a>
            {a.catatan ? <span className="col-span-2 text-[10px] text-dim">{a.catatan[lang]}</span> : null}
          </li>
        ))}
      </ul>
    </Bagian>
  );
}
