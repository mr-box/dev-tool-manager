import type { Software } from "../../../shared/api-contract";

interface SoftwareTableProps {
  displayItems: Software[];
  listLoading: boolean;
  t: (key: any) => string;
  onOpenDetail: (software: Software) => void;
  onRemoveFromHomepage: (name: string) => void;
}

export function SoftwareTable({
  displayItems,
  listLoading,
  t,
  onOpenDetail,
  onRemoveFromHomepage
}: SoftwareTableProps) {
  return (
    <div className="fade-in rounded-2xl border border-[var(--line)] bg-white/80 p-4 shadow-card">
      <h2 className="mb-3 text-xl font-bold">{t("installedSoftware")}</h2>
      {listLoading ? (
        <p className="text-sm text-slate-600">{t("loadingSoftwareList")}</p>
      ) : displayItems.length === 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4 text-sm text-slate-600">
          {t("noVisibleSoftware")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="pb-2">{t("name")}</th>
                <th className="pb-2">{t("version")}</th>
                <th className="pb-2">{t("method")}</th>
                <th className="pb-2 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((software) => (
                <tr
                  key={software.name}
                  onClick={() => onOpenDetail(software)}
                  className="cursor-pointer border-b border-[var(--line)]/70 transition hover:bg-sky-50"
                >
                  <td className="py-2 font-medium">{software.displayName}</td>
                  <td className="py-2 text-slate-600">{software.version ?? "-"}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold">
                      {software.installMethod}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveFromHomepage(software.name);
                      }}
                      className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      {t("remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
