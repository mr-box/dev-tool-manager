import type { Software, ManualSoftware } from "../../../shared/api-contract";
import { normalizeName, hasVisibleName } from "../utils";

export type SortMode = "name" | "visible_then_name";

export interface EditDraft {
  displayName: string;
  configDir: string;
  installPath: string;
  command: string;
}

interface SettingsModalProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  t: (key: any) => string;
  newManual: ManualSoftware;
  setNewManual: React.Dispatch<React.SetStateAction<ManualSoftware>>;
  onAddManualSoftware: () => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  settingsSearch: string;
  setSettingsSearch: (search: string) => void;
  allItems: Software[];
  visibleNames: string[];
  filteredSettingsItems: Software[];
  manualSoftware: ManualSoftware[];
  onStartEditSoftware: (software: Software) => void;
  onDeleteManualSoftware: (name: string) => void;
  onToggleVisible: (name: string) => void;
  editingSoftwareName: string | null;
  editDraft: EditDraft;
  setEditDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  onSaveEditSoftware: (name: string) => void;
  onCancelEditSoftware: () => void;
  ignoredResiduePaths: string[];
  onUnignoreResidue: (path: string) => void;
}

export function SettingsModal({
  settingsOpen,
  setSettingsOpen,
  t,
  newManual,
  setNewManual,
  onAddManualSoftware,
  sortMode,
  setSortMode,
  settingsSearch,
  setSettingsSearch,
  allItems,
  visibleNames,
  filteredSettingsItems,
  manualSoftware,
  onStartEditSoftware,
  onDeleteManualSoftware,
  onToggleVisible,
  editingSoftwareName,
  editDraft,
  setEditDraft,
  onSaveEditSoftware,
  onCancelEditSoftware,
  ignoredResiduePaths,
  onUnignoreResidue
}: SettingsModalProps) {
  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{t("settingsTitle")}</h3>
            <p className="text-sm text-slate-600">{t("settingsDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("close")}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <section className="mb-4 rounded-xl border border-[var(--line)] bg-slate-50 p-3">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">{t("addSoftwareSection")}</h4>
            <p className="mb-3 text-xs text-slate-600">{t("addSoftwareSectionDesc")}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                value={newManual.name ?? ""}
                onChange={(event) => setNewManual((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t("manualSoftwareName")}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={newManual.displayName ?? ""}
                onChange={(event) => setNewManual((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder={t("displayNameOptional")}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={newManual.configDir ?? ""}
                onChange={(event) => setNewManual((prev) => ({ ...prev, configDir: event.target.value }))}
                placeholder={t("configDirectoryOptional")}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={newManual.installPath ?? ""}
                onChange={(event) => setNewManual((prev) => ({ ...prev, installPath: event.target.value }))}
                placeholder={t("installPathOptional")}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={newManual.command ?? ""}
                onChange={(event) => setNewManual((prev) => ({ ...prev, command: event.target.value }))}
                placeholder={t("commandOptional")}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm md:col-span-2"
              />
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={onAddManualSoftware}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t("addManualSoftware")}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--line)] bg-slate-50 p-3">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h4 className="text-sm font-semibold text-slate-800">{t("visibilitySection")}</h4>
              <div className="text-sm text-slate-700">
                {t("visibleOnHomepage")}:{" "}
                <span className="font-semibold">
                  {allItems.filter((item) => hasVisibleName(visibleNames, item.name)).length}/
                  {allItems.length}
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-600">{t("visibilitySectionDesc")}</p>
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">{t("sort")}</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                >
                  <option value="name">{t("sortByName")}</option>
                  <option value="visible_then_name">{t("sortVisibleThenName")}</option>
                </select>
              </label>
              <input
                type="text"
                value={settingsSearch}
                onChange={(event) => setSettingsSearch(event.target.value)}
                placeholder={t("searchSoftwarePlaceholder")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 md:max-w-sm"
              />
            </div>

            <div className="max-h-[52vh] overflow-auto rounded-xl border border-[var(--line)] bg-white">
              {filteredSettingsItems.map((software) => {
                const isManualItem = manualSoftware.some(
                  (item) => normalizeName(item.name) === normalizeName(software.name)
                );
                return (
                  <div
                    key={software.name}
                    className="border-b border-[var(--line)] px-3 py-2 last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{software.displayName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {software.installMethod} {software.version ? `• ${software.version}` : ""}
                        </p>
                        {software.configDir && (
                          <p className="truncate text-xs text-slate-500">{software.configDir}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onStartEditSoftware(software)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {t("edit")}
                        </button>
                        {isManualItem && (
                          <button
                            type="button"
                            onClick={() => onDeleteManualSoftware(software.name)}
                            className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            {t("delete")}
                          </button>
                        )}
                        <input
                          type="checkbox"
                          checked={hasVisibleName(visibleNames, software.name)}
                          onChange={() => onToggleVisible(software.name)}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                    {editingSoftwareName === software.name && (
                      <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-2">
                        <input
                          type="text"
                          value={editDraft.displayName}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, displayName: event.target.value }))
                          }
                          placeholder={t("displayName")}
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editDraft.configDir}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, configDir: event.target.value }))
                          }
                          placeholder={t("configDirectory")}
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editDraft.installPath}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, installPath: event.target.value }))
                          }
                          placeholder={t("installPath")}
                          className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-2"
                        />
                        <input
                          type="text"
                          value={editDraft.command}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, command: event.target.value }))
                          }
                          placeholder={t("command")}
                          className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-2"
                        />
                        <div className="flex items-center gap-2 md:col-span-2">
                          <button
                            type="button"
                            onClick={() => onSaveEditSoftware(software.name)}
                            className="rounded border border-slate-300 bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            {t("save")}
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEditSoftware}
                            className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredSettingsItems.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">{t("noSoftwareMatched")}</p>
              )}
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-[var(--line)] bg-slate-50 p-3">
            <h4 className="text-sm font-semibold text-slate-800">{t("ignoredResiduesSection")}</h4>
            <p className="mb-3 mt-1 text-xs text-slate-600">{t("ignoredResiduesSectionDesc")}</p>
            <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
              {ignoredResiduePaths.map((item) => (
                <div
                  key={item}
                  className="mb-2 flex items-start justify-between gap-2 text-xs text-slate-700 last:mb-0"
                >
                  <code className="min-w-0 truncate text-slate-600">{item}</code>
                  <button
                    type="button"
                    onClick={() => onUnignoreResidue(item)}
                    className="rounded border border-red-300 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                  >
                    {t("delete")}
                  </button>
                </div>
              ))}
              {ignoredResiduePaths.length === 0 && (
                <p className="text-xs text-slate-500">{t("noIgnoredResidues")}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
