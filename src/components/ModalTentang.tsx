"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Snapshot } from "@/lib/jenis";
import { t, type Lang } from "@/lib/i18n";
import { relatif } from "@/lib/waktu";
import { URL_REPO } from "@/lib/situs";

export default function ModalTentang({ snapshot, lang, sekarang, onTutup }: { snapshot: Snapshot | null; lang: Lang; sekarang: number; onTutup: () => void }) {
  const tombolRef = useRef<HTMLButtonElement>(null);
  // Escape ditangani pintasan keyboard di Konsol; di sini cukup pindahkan fokus ke tombol tutup
  useEffect(() => {
    tombolRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-tentang"
        className="kaca-padat braket gulir max-h-[88dvh] w-full max-w-[620px] p-5 sm:max-h-[84vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="judul-tentang" className="text-[15px] font-bold tracking-wide text-cyan">
            {t("tentang_judul", lang)}
          </h2>
          <button ref={tombolRef} className="tombol-ikon" onClick={onTutup} aria-label={t("tutup", lang)}>
            <X size={16} />
          </button>
        </div>
        <ul className="space-y-2.5 text-[12.5px] leading-relaxed">
          {(["jujur_1", "jujur_2", "jujur_3", "jujur_4"] as const).map((k) => (
            <li key={k} className="border-l-2 border-[var(--border-strong)] pl-3">
              {t(k, lang)}
            </li>
          ))}
        </ul>

        {snapshot ? (
          <>
            <h3 className="label-kecil mt-5 mb-2 text-teks">{t("sumber", lang)}</h3>
            <ul className="space-y-1.5 text-[12px]" data-testid="daftar-sumber">
              {snapshot.sumber.map((s) => {
                const lama = !s.ok && s.diperbarui;
                const warna = s.ok ? "bg-ok" : lama ? "bg-warn" : "bg-dim";
                const status = s.ok ? t("status_ok", lang) : lama ? t("status_lama", lang) : t("status_mati", lang);
                return (
                  <li key={s.id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-x-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${warna}`} aria-hidden />
                    <span>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="tautan">
                        {s.nama}
                      </a>{" "}
                      <span className="text-muted">
                        · {status}
                        {s.diperbarui ? ` · ${relatif(s.diperbarui, sekarang, lang)}` : ""}
                        {s.catatan ? ` · ${s.catatan}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted">
              {t("dibuat", lang)}: {new Date(snapshot.dibuat).toLocaleString(lang === "id" ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta" })} WIB
            </p>
          </>
        ) : null}

        <p className="mt-4 text-[11px] leading-relaxed text-muted">{t("lisensi", lang)}</p>
        <p className="mt-2 text-[11px] text-muted">{t("pintasan", lang)}</p>
        <p className="mt-3 text-[11px]">
          <a href={URL_REPO} target="_blank" rel="noopener noreferrer" className="tautan">
            github.com/Avalon2222/cyber-attack-map-id
          </a>
        </p>
      </div>
    </div>
  );
}
