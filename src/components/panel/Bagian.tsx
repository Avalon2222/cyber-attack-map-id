import type { ReactNode } from "react";

/** Kerangka satu bagian panel: judul kecil, subjudul, isi. */
export function Bagian({ judul, sub, kanan, children, className = "" }: { judul: string; sub?: string; kanan?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-3.5 py-3 ${className}`}>
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="label-kecil text-teks">{judul}</h2>
          {sub ? <p className="mt-0.5 text-[10.5px] leading-snug text-muted">{sub}</p> : null}
        </div>
        {kanan}
      </header>
      {children}
    </section>
  );
}

/** Satu baris batang horizontal: label, batang, nilai. */
export function Batang({ label, nilai, persen, warna, tebal = false }: { label: ReactNode; nilai: string; persen: number; warna: string; tebal?: boolean }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-[3px]">
      <span className={`truncate text-[12px] ${tebal ? "text-teks" : "text-teks/85"}`}>{label}</span>
      <span className="text-right text-[11.5px] tabular-nums text-teks">{nilai}</span>
      <span className="col-span-2 h-[4px] bg-white/5">
        <span className="block h-full" style={{ width: `${Math.max(1.5, Math.min(100, persen))}%`, background: warna, boxShadow: `0 0 8px ${warna}` }} />
      </span>
    </li>
  );
}
