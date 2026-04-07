import type { Residue } from "../../../shared/api-contract";
import { formatBytes } from "../utils";

interface ResidueListProps {
  residues: Residue[];
  totalResidueSize: number;
  residueLoading: boolean;
  t: (key: any) => string;
  onIgnoreResidue: (path: string) => void;
  onStartAssociateResidue: (path: string, softwareName: string) => void;
  onOpenResidue: (path: string) => void;
}

export function ResidueList({
  residues,
  totalResidueSize,
  residueLoading,
  t,
  onIgnoreResidue,
  onStartAssociateResidue,
  onOpenResidue
}: ResidueListProps) {
  return (
    <section className="fade-in mt-6 rounded-2xl border border-[var(--line)] bg-white/85 p-4 shadow-card">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold">{t("suspectedResidues")}</h2>
          <p className="text-sm text-slate-600">
            {t("total")}: {residues.length} {t("itemsLabel")} ({formatBytes(totalResidueSize)})
          </p>
        </div>
        {residueLoading && <p className="text-sm text-slate-500">{t("refreshingResidues")}</p>}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {residues.length === 0 && !residueLoading && (
          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-3 text-sm text-slate-600">
            {t("noResidues")}
          </div>
        )}
        {residues.map((item) => (
          <div
            key={item.path}
            className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-white/80 p-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold">{item.softwareName}</p>
              <code className="block truncate text-xs text-slate-600">{item.path}</code>
              <p className="text-xs text-slate-500">
                {item.type} • {formatBytes(item.size)}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onIgnoreResidue(item.path)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t("ignore")}
              </button>
              <button
                type="button"
                onClick={() => onStartAssociateResidue(item.path, item.softwareName)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t("associate")}
              </button>
              <button
                type="button"
                onClick={() => onOpenResidue(item.path)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t("open")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
