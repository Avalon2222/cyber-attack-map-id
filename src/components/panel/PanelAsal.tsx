"use client";

import { useState } from "react";
import type { Snapshot } from "@/lib/jenis";
import { t, type Lang } from "@/lib/i18n";
import { bendera, namaNegara } from "@/lib/negara";
import { angka, tanggalPendek } from "@/lib/waktu";
import { WARNA } from "@/lib/warna";
import { Bagian, Batang } from "./Bagian";

export default function PanelAsal({ snapshot, lang }: { snapshot: Snapshot; lang: Lang }) {
  const [lapis, setLapis] = useState<"l7" | "l3">("l7");
  const { asalL7, asalL3, periode } = snapshot.masuk;
  const ada = asalL7.length > 0 || asalL3.length > 0;

  if (!ada) {
    const g = snapshot.globalAsal.slice(0, 8);
    const maks = Math.max(1, ...g.map((p) => p.persen));
    return (
      <Bagian judul={t("asal_judul", lang)}>
        <p className="mb-3 border-l-2 border-warn/60 pl-2 text-[11px] leading-snug text-muted">{t("asal_kosong", lang)}</p>
        {g.length ? (
          <>
            <div className="label-kecil mb-1">
              {t("asal_global", lang)} · {snapshot.peringkatID?.sumber}
            </div>
            <ul>
              {g.map((p) => (
                <Batang
                  key={p.kode}
                  label={`${bendera(p.kode)} ${namaNegara(p.kode, lang)}`}
                  nilai={`${angka(p.persen, lang, 1)}%`}
                  persen={(100 * p.persen) / maks}
                  warna={p.kode === "ID" ? "#ff2e4d" : "#22e3ff"}
                  tebal={p.kode === "ID"}
                />
              ))}
            </ul>
          </>
        ) : null}
      </Bagian>
    );
  }

  const daftar = (lapis === "l7" ? asalL7 : asalL3).slice(0, 10);
  const maks = Math.max(1, ...daftar.map((p) => p.persen));
  const warna = lapis === "l7" ? WARNA.web : WARNA.ddos;
  const sub = periode ? `${t("asal_sub", lang)} · ${tanggalPendek(periode.mulai, lang)}–${tanggalPendek(periode.akhir, lang)}` : t("asal_sub", lang);

  return (
    <Bagian
      judul={t("asal_judul", lang)}
      sub={sub}
      kanan={
        <div role="tablist" aria-label={t("asal_judul", lang)} className="flex shrink-0 border border-[var(--border)]">
          {(["l7", "l3"] as const).map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={lapis === l}
              onClick={() => setLapis(l)}
              className={`h-7 px-2 text-[10.5px] ${lapis === l ? "bg-[var(--cyan-soft)] text-cyan" : "text-muted"}`}
            >
              {t(l === "l7" ? "asal_l7" : "asal_l3", lang)}
            </button>
          ))}
        </div>
      }
    >
      <ul data-testid="daftar-asal">
        {daftar.map((p, i) => (
          <Batang
            key={p.kode}
            label={
              <>
                <span className="mr-1.5 inline-block w-4 text-right text-dim tabular-nums">{i + 1}</span>
                {bendera(p.kode)} {namaNegara(p.kode, lang)}
                {p.kode === "ID" ? <span className="ml-1 text-[10px] text-muted">({t("domestik", lang)})</span> : null}
              </>
            }
            nilai={`${angka(p.persen, lang, 1)}%`}
            persen={(100 * p.persen) / maks}
            warna={p.kode === "ID" ? "#56657b" : warna}
          />
        ))}
      </ul>
      {lapis === "l3" ? <p className="mt-2 text-[10.5px] leading-snug text-dim">{t("asal_l3_catatan", lang)}</p> : null}
    </Bagian>
  );
}
