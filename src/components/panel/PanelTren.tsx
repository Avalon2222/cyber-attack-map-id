"use client";

import type { Snapshot } from "@/lib/jenis";
import { t, type Lang } from "@/lib/i18n";
import { angka, tanggalPendek } from "@/lib/waktu";
import { WARNA } from "@/lib/warna";
import { Bagian } from "./Bagian";

/**
 * Grafik 30 hari: batang = URL malware baru di jaringan Indonesia (URLhaus, sumbu kiri),
 * garis = porsi serangan global yang menyasar Indonesia (Cloudflare Radar, sumbu kanan, %).
 * SVG polos supaya ringan dan tajam di HP.
 */
export default function PanelTren({ snapshot, lang, tinggi = 110 }: { snapshot: Snapshot; lang: Lang; tinggi?: number }) {
  const data = snapshot.tren;
  const W = 600;
  const H = tinggi;
  const pad = { l: 26, r: 30, t: 8, b: 16 };
  const n = Math.max(1, data.length);
  const lebarBar = (W - pad.l - pad.r) / n;
  const maksBar = Math.max(1, ...data.map((d) => d.malwareBaru ?? 0));
  const adaL7 = data.some((d) => d.porsiL7 !== undefined);
  const adaL3 = data.some((d) => d.porsiL3 !== undefined);
  const maksGaris = Math.max(0.5, ...data.map((d) => Math.max(d.porsiL7 ?? 0, d.porsiL3 ?? 0)));
  const x = (i: number) => pad.l + lebarBar * (i + 0.5);
  const yBar = (v: number) => H - pad.b - ((H - pad.t - pad.b) * v) / maksBar;
  const yGaris = (v: number) => H - pad.b - ((H - pad.t - pad.b) * v) / maksGaris;

  const garis = (kunci: "porsiL7" | "porsiL3") =>
    data
      .map((d, i) => (d[kunci] === undefined ? null : `${x(i).toFixed(1)},${yGaris(d[kunci]!).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");

  return (
    <Bagian judul={t("tren_judul", lang)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t("tren_malware", lang)} data-testid="grafik-tren">
        {[0.5, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={yBar(maksBar * f)} y2={yBar(maksBar * f)} stroke="rgba(34,227,255,0.08)" />
        ))}
        {data.map((d, i) => {
          const v = d.malwareBaru ?? 0;
          return (
            <rect key={d.tanggal} x={x(i) - lebarBar * 0.35} width={lebarBar * 0.7} y={yBar(v)} height={Math.max(0, H - pad.b - yBar(v))} fill={WARNA.malware} opacity={0.75}>
              <title>{`${tanggalPendek(d.tanggal, lang)}: ${v} URL${d.porsiL7 !== undefined ? ` · L7 ${angka(d.porsiL7, lang, 2)}%` : ""}${d.porsiL3 !== undefined ? ` · L3 ${angka(d.porsiL3, lang, 2)}%` : ""}`}</title>
            </rect>
          );
        })}
        {adaL7 ? <polyline points={garis("porsiL7")} fill="none" stroke={WARNA.web} strokeWidth={1.8} /> : null}
        {adaL3 ? <polyline points={garis("porsiL3")} fill="none" stroke={WARNA.ddos} strokeWidth={1.8} strokeDasharray="4 3" /> : null}
        <text x={pad.l - 4} y={yBar(maksBar) + 4} textAnchor="end" fontSize={10} fill="#8494ab">
          {maksBar}
        </text>
        <text x={pad.l - 4} y={H - pad.b} textAnchor="end" fontSize={10} fill="#8494ab">
          0
        </text>
        {adaL7 || adaL3 ? (
          <text x={W - pad.r + 4} y={yGaris(maksGaris) + 4} fontSize={10} fill="#8494ab">
            {angka(maksGaris, lang, 1)}%
          </text>
        ) : null}
        {data.length ? (
          <>
            <text x={pad.l} y={H - 3} fontSize={10} fill="#8494ab">
              {tanggalPendek(data[0].tanggal, lang)}
            </text>
            <text x={W - pad.r} y={H - 3} fontSize={10} fill="#8494ab" textAnchor="end">
              {tanggalPendek(data[data.length - 1].tanggal, lang)}
            </text>
          </>
        ) : null}
      </svg>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5" style={{ background: WARNA.malware }} /> {t("tren_malware", lang)}
        </li>
        {adaL7 ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-3.5" style={{ background: WARNA.web }} /> {t("tren_l7", lang)}
          </li>
        ) : null}
        {adaL3 ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-3.5 border-t-2 border-dashed" style={{ borderColor: WARNA.ddos }} /> {t("tren_l3", lang)}
          </li>
        ) : null}
      </ul>
    </Bagian>
  );
}
