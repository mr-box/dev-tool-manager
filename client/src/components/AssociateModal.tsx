import type { Software } from "../../../shared/api-contract";

interface AssociateModalProps {
  associateResiduePath: string | null;
  associateSoftwareName: string;
  setAssociateSoftwareName: (name: string) => void;
  filteredAssociateItems: Software[];
  associateSaving: boolean;
  t: (key: any) => string;
  onCancelAssociateResidue: () => void;
  onConfirmAssociateResidue: () => void;
}

export function AssociateModal({
  associateResiduePath,
  associateSoftwareName,
  setAssociateSoftwareName,
  filteredAssociateItems,
  associateSaving,
  t,
  onCancelAssociateResidue,
  onConfirmAssociateResidue
}: AssociateModalProps) {
  if (!associateResiduePath) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold">{t("associateResidueTitle")}</h3>
        <p className="mt-1 text-sm text-slate-600">{t("associateResidueDesc")}</p>
        <code className="mt-2 block rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
          {associateResiduePath}
        </code>

        <label className="mt-4 block text-sm text-slate-700">
          {t("associateSoftwareLabel")}
          <input
            type="text"
            list="associate-software-options"
            value={associateSoftwareName}
            onChange={(event) => setAssociateSoftwareName(event.target.value)}
            placeholder={t("associateFilterPlaceholder")}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <datalist id="associate-software-options">
            {filteredAssociateItems.map((software) => (
              <option key={software.name} value={software.name}>
                {software.displayName}
              </option>
            ))}
          </datalist>
          {filteredAssociateItems.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">{t("noSoftwareMatched")}</p>
          )}
        </label>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancelAssociateResidue}
            disabled={associateSaving}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirmAssociateResidue}
            disabled={!associateSoftwareName.trim() || associateSaving}
            className="rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {associateSaving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
