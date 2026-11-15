"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe2, Info, Languages, LocateFixed, Map as IkonPeta, Pause, Play, ChevronUp, ChevronDown } from "lucide-react";
import type { HostID, Kategori, Snapshot } from "@/lib/jenis";
import { KATEGORI } from "@/lib/jenis";
import { labelKategori, t, type Lang } from "@/lib/i18n";
import { muatSnapshot } from "@/lib/muat";
import { bendera, namaNegara } from "@/lib/negara";
import { angka, jamWib, relatif, tanggalPendek } from "@/lib/waktu";
import { WARNA } from "@/lib/warna";
import type { Busur } from "@/lib/serangan";
import Peta from "./Peta";
import PanelAsal from "./panel/PanelAsal";
import PanelHost from "./panel/PanelHost";
import PanelTren from "./panel/PanelTren";
import FeedLive, { type Kejadian } from "./panel/FeedLive";
import { PanelBssn, PanelGlobal, PanelKampanye, PanelRansomware } from "./panel/PanelIntel";
import ModalTentang from "./ModalTentang";
import DetailHost from "./DetailHost";

const MAKS_FEED = 40;
const SEGAR_MS = 10 * 60_000;
type Tab = "asal" | "feed" | "host" | "tren" | "intel";
const TAB: Tab[] = ["asal", "feed", "host", "tren", "intel"];

function useLebar(): number {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return w;
}

function useSekarang(interval = 1000): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setN(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return n;
}

function labelWaktu(iso: string, sekarang: number, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // indikator hari ini: jam WIB; lebih lama: tanggal
  return sekarang - d.getTime() < 20 * 3_600_000 ? jamWib(d).slice(0, 5) : tanggalPendek(iso, lang);
}

export default function Konsol() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [gagal, setGagal] = useState(false);
  const [petaGagal, setPetaGagal] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem("cam-lang");
      if (s === "id" || s === "en") return s;
    } catch {
      /* abaikan */
    }
    return navigator.language?.toLowerCase().startsWith("id") ? "id" : "en";
  });
  const [filter, setFilter] = useState<Set<Kategori>>(() => new Set(KATEGORI));
  const [jeda, setJeda] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [datar, setDatar] = useState(false);
  const [reset, setReset] = useState(0);
  const [tentang, setTentang] = useState(false);
  const [pilih, setPilih] = useState<HostID | null>(null);
  const [tab, setTab] = useState<Tab>("asal");
  const [lembarBuka, setLembarBuka] = useState(false);
  const [feed, setFeed] = useState<Kejadian[]>([]);
  const antrean = useRef<Kejadian[]>([]);
  const busurTerakhir = useRef(0);
  const lebar = useLebar();
  const sekarang = useSekarang();
  const hp = lebar < 1024;

  useEffect(() => {
    try {
      localStorage.setItem("cam-lang", lang);
    } catch {
      /* abaikan */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  // muat + segarkan snapshot tiap 10 menit
  useEffect(() => {
    let hidup = true;
    const muat = async () => {
      const s = await muatSnapshot();
      if (!hidup) return;
      if (s) {
        setSnapshot((lama) => (lama && lama.dibuat === s.dibuat ? lama : s));
        setGagal(false);
      } else setGagal((g) => g || true);
    };
    muat();
    const id = setInterval(muat, SEGAR_MS);
    return () => {
      hidup = false;
      clearInterval(id);
    };
  }, []);

  // feed: kejadian dari kanvas ditampung lalu di-flush berkala, supaya React gak render tiap frame
  useEffect(() => {
    const id = setInterval(() => {
      if (!antrean.current.length) return;
      const baru = antrean.current.reverse();
      antrean.current = [];
      setFeed((f) => [...baru, ...f].slice(0, MAKS_FEED));
    }, 450);
    return () => clearInterval(id);
  }, []);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const onPing = useCallback((h: HostID) => {
    const l = langRef.current;
    antrean.current.push({
      id: `p${h.id}${Math.random().toString(36).slice(2, 7)}`,
      jenis: "ping",
      kategori: h.kategori,
      waktu: labelWaktu(h.waktu, Date.now(), l),
      teks: `${h.ip} · ${h.kota}${h.jumlah > 1 ? ` · ${h.jumlah} IP` : ""}`,
      sub: `${labelKategori(h.kategori, l)}${h.asn ? ` · AS${h.asn}` : ""} · ${h.sumber}`,
    });
  }, []);

  const snapRef = useRef(snapshot);
  useEffect(() => {
    snapRef.current = snapshot;
  }, [snapshot]);

  const onBusur = useCallback((b: Busur) => {
    // busur muncul beberapa kali per detik; feed cukup ~1 per detik biar kebaca
    const now = performance.now();
    if (now - busurTerakhir.current < 1100) return;
    busurTerakhir.current = now;
    const l = langRef.current;
    const a = snapRef.current?.masuk.aliran.find((x) => x.asal === b.kode && x.kategori === b.kategori);
    antrean.current.push({
      id: `b${b.id}`,
      jenis: "busur",
      kategori: b.kategori,
      waktu: "",
      teks: `${bendera(b.kode)} ${namaNegara(b.kode, l)} → Indonesia`,
      sub: `${labelKategori(b.kategori, l)}${a ? ` · ${angka(a.persen, l, 1)}%` : ""} · Cloudflare Radar`,
    });
  }, []);

  const toggleKategori = useCallback((k: Kategori) => {
    setFilter((f) => {
      const n = new Set(f);
      if (n.has(k) && n.size > 1) n.delete(k);
      else n.add(k);
      return n;
    });
  }, []);

  // pintasan keyboard
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === " ") {
        if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
        e.preventDefault();
        setJeda((j) => !j);
      } else if (k === "g") setDatar((d) => !d);
      else if (k === "l") setLang((x) => (x === "id" ? "en" : "id"));
      else if (k === "r") setReset((r) => r + 1);
      else if (k === "i" || k === "?") setTentang((x) => !x);
      else if (k === "escape") {
        setPilih(null);
        setTentang(false);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const kategoriAda = useMemo(() => {
    if (!snapshot) return [];
    const s = new Set<Kategori>(snapshot.host.map((h) => h.kategori));
    for (const a of snapshot.masuk.aliran) s.add(a.kategori);
    return KATEGORI.filter((k) => s.has(k));
  }, [snapshot]);

  const totalIp = snapshot?.kategori.reduce((s, k) => s + k.jumlah, 0) ?? 0;
  const jumlahAsal = snapshot ? new Set(snapshot.masuk.aliran.map((a) => a.asal)).size : 0;

  const chips = (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]" role="group" aria-label={t("filter", lang)}>
      {kategoriAda.map((k) => (
        <button key={k} className="chip" aria-pressed={filter.has(k)} onClick={() => toggleKategori(k)}>
          <span className="titik" style={{ background: WARNA[k], color: WARNA[k] }} />
          {labelKategori(k, lang)}
        </button>
      ))}
    </div>
  );

  const tombol = (
    <div className="flex items-center gap-1.5">
      <button className={`tombol-ikon ${jeda ? "aktif" : ""}`} onClick={() => setJeda((j) => !j)} aria-label={jeda ? t("lanjut", lang) : t("jeda", lang)} title={jeda ? t("lanjut", lang) : t("jeda", lang)}>
        {jeda ? <Play size={15} /> : <Pause size={15} />}
      </button>
      <button className={`tombol-ikon hidden sm:inline-flex ${datar ? "aktif" : ""}`} onClick={() => setDatar((d) => !d)} aria-label={t("globe", lang)} title={t("globe", lang)}>
        {datar ? <IkonPeta size={15} /> : <Globe2 size={15} />}
      </button>
      <button className="tombol-ikon hidden sm:inline-flex" onClick={() => setReset((r) => r + 1)} aria-label={t("reset", lang)} title={t("reset", lang)}>
        <LocateFixed size={15} />
      </button>
      <button className="tombol-ikon w-auto min-w-[34px] px-2 text-[11px]" onClick={() => setLang((x) => (x === "id" ? "en" : "id"))} aria-label={t("bahasa", lang)} title={t("bahasa", lang)}>
        <Languages size={14} className="mr-1 hidden sm:block" />
        {lang.toUpperCase()}
      </button>
      <button className="tombol-ikon" onClick={() => setTentang(true)} aria-label={t("info", lang)} title={t("info", lang)}>
        <Info size={15} />
      </button>
    </div>
  );

  const umur = snapshot ? relatif(snapshot.dibuat, sekarang, lang) : "";

  const kepala = (
    <header className="pointer-events-auto relative z-20 flex items-center justify-between gap-3 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 lg:px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="denyut inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="truncate text-[13px] font-bold tracking-[0.08em] text-teks sm:text-[16px] sm:tracking-[0.2em]">
            CYBER ATTACK MAP <span className="text-accent">{"// ID"}</span>
          </span>
        </div>
        <div className="mt-0.5 hidden truncate text-[11px] text-muted sm:block">{t("tagline", lang)}</div>
      </div>
      {!hp ? (
        <div className="flex items-center gap-5 text-[11px]">
          <Stat label="IP jahat · ID" nilai={angka(totalIp, lang)} warna="text-accent" />
          <Stat label={lang === "id" ? "negara asal" : "origin countries"} nilai={jumlahAsal ? angka(jumlahAsal, lang) : "–"} warna="text-warn" />
          <Stat label={t("data", lang)} nilai={umur || "…"} warna="text-cyan" />
          <Stat label="WIB" nilai={jamWib(new Date(sekarang))} warna="text-teks" />
        </div>
      ) : null}
      {tombol}
    </header>
  );

  const badge = (
    <button onClick={() => setTentang(true)} className="pointer-events-auto inline-flex max-w-full items-center gap-2 border border-[var(--border-strong)] bg-black/60 px-2 py-1 text-[10px] tracking-[0.12em] text-cyan">
      <span className="truncate">{t("badge", lang)}</span>
      {hp && umur ? <span className="shrink-0 text-muted normal-case tracking-normal">· {umur}</span> : null}
    </button>
  );

  const isiTab = (x: Tab) =>
    !snapshot ? null : x === "asal" ? (
      <PanelAsal snapshot={snapshot} lang={lang} />
    ) : x === "feed" ? (
      <FeedLive kejadian={feed} lang={lang} />
    ) : x === "host" ? (
      <PanelHost snapshot={snapshot} lang={lang} />
    ) : x === "tren" ? (
      <PanelTren snapshot={snapshot} lang={lang} tinggi={130} />
    ) : (
      <>
        <PanelGlobal snapshot={snapshot} lang={lang} />
        <PanelKampanye snapshot={snapshot} lang={lang} />
        <PanelRansomware snapshot={snapshot} lang={lang} sekarang={sekarang} />
        <PanelBssn lang={lang} />
      </>
    );

  return (
    <main className="relative h-full w-full overflow-hidden bg-bg">
      <Peta
        snapshot={snapshot}
        filter={filter}
        jeda={jeda}
        datar={datar}
        resetSinyal={reset}
        onPing={onPing}
        onBusur={onBusur}
        onPilih={setPilih}
        onGagal={() => setPetaGagal(true)}
      />
      <div className="vignette" />
      <div className="pindai" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        {kepala}
        <div className="pointer-events-none flex flex-col gap-2 px-3 lg:px-4">
          <div>{badge}</div>
          {hp ? <div className="pointer-events-auto">{chips}</div> : null}
        </div>

        {!hp && snapshot ? (
          <div className="flex min-h-0 flex-1 gap-3 px-4 pt-3 pb-4">
            <aside className="kaca braket gulir pointer-events-auto w-[320px] shrink-0 self-start max-h-full" data-testid="panel-kiri">
              <PanelAsal snapshot={snapshot} lang={lang} />
              <div className="border-t border-[var(--border)]">
                <PanelHost snapshot={snapshot} lang={lang} />
              </div>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col justify-end gap-2">
              {pilih ? (
                <div className="pointer-events-auto self-start">
                  <DetailHost host={pilih} lang={lang} sekarang={sekarang} onTutup={() => setPilih(null)} />
                </div>
              ) : null}
              <div className="pointer-events-auto max-w-full self-center">{chips}</div>
              <div className="kaca braket pointer-events-auto mx-auto w-full max-w-[640px]">
                <PanelTren snapshot={snapshot} lang={lang} />
              </div>
            </div>
            <aside className="flex w-[330px] shrink-0 flex-col gap-3 min-h-0" data-testid="panel-kanan">
              <div className="kaca braket gulir pointer-events-auto min-h-0 flex-[1.1]">
                <FeedLive kejadian={feed} lang={lang} />
              </div>
              <div className="kaca braket gulir pointer-events-auto min-h-0 flex-1">
                <PanelGlobal snapshot={snapshot} lang={lang} />
                <div className="border-t border-[var(--border)]">
                  <PanelKampanye snapshot={snapshot} lang={lang} />
                </div>
                <div className="border-t border-[var(--border)]">
                  <PanelRansomware snapshot={snapshot} lang={lang} sekarang={sekarang} />
                </div>
                <div className="border-t border-[var(--border)]">
                  <PanelBssn lang={lang} />
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {hp && snapshot ? (
          <div className="mt-auto flex flex-col">
            {pilih ? (
              <div className="pointer-events-auto mb-2 px-3">
                <DetailHost host={pilih} lang={lang} sekarang={sekarang} onTutup={() => setPilih(null)} />
              </div>
            ) : null}
            <section className="kaca-padat pointer-events-auto pb-[env(safe-area-inset-bottom)]" data-testid="lembar">
              <button
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left"
                onClick={() => setLembarBuka((b) => !b)}
                aria-expanded={lembarBuka}
                aria-controls="isi-lembar"
              >
                <span className="flex min-w-0 items-center gap-2 text-[11px]">
                  <span className="font-bold text-accent tabular-nums">{angka(totalIp, lang)}</span>
                  <span className="text-muted">IP · ID</span>
                  {feed[0] ? (
                    <span className="truncate text-teks/85">
                      <span style={{ color: WARNA[feed[0].kategori] }}>●</span> {feed[0].teks}
                    </span>
                  ) : null}
                </span>
                {lembarBuka ? <ChevronDown size={16} className="shrink-0 text-muted" /> : <ChevronUp size={16} className="shrink-0 text-muted" />}
              </button>
              <div role="tablist" aria-label={t("panel", lang)} className="flex border-y border-[var(--border)]">
                {TAB.map((x) => (
                  <button
                    key={x}
                    role="tab"
                    id={`tab-${x}`}
                    aria-selected={tab === x}
                    aria-controls="isi-lembar"
                    className="tab"
                    onClick={() => {
                      setTab(x);
                      setLembarBuka(true);
                    }}
                  >
                    {t(`tab_${x}` as const, lang)}
                  </button>
                ))}
              </div>
              {lembarBuka ? (
                <div id="isi-lembar" role="tabpanel" aria-labelledby={`tab-${tab}`} className="gulir max-h-[46dvh]">
                  {isiTab(tab)}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {!snapshot ? (
          <div className="m-auto px-6 text-center text-[12px] text-muted" role="status">
            {gagal ? t("gagal", lang) : <span className="kedip">{t("memuat", lang)}</span>}
          </div>
        ) : null}
      </div>

      {petaGagal ? (
        <div className="absolute inset-x-0 top-1/3 z-20 mx-auto max-w-sm px-6 text-center text-[12px] text-warn" role="alert">
          {t("peta_gagal", lang)}
        </div>
      ) : null}

      {tentang ? <ModalTentang snapshot={snapshot} lang={lang} sekarang={sekarang} onTutup={() => setTentang(false)} /> : null}
    </main>
  );
}

function Stat({ label, nilai, warna }: { label: string; nilai: string; warna: string }) {
  return (
    <div className="text-right leading-tight">
      <div className={`text-[14px] font-bold tabular-nums ${warna}`}>{nilai}</div>
      <div className="label-kecil text-[9px]">{label}</div>
    </div>
  );
}
