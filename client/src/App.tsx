import { useEffect, useRef, useState } from "react";
import type {
  Residue,
  Software,
  ManualSoftware,
  SoftwareOverride,
  UserSettings
} from "../../shared/api-contract";
import {
  getResidues,
  getScanStatus,
  getSettings,
  getSoftwareConfigChildren,
  getSoftwareDetail,
  getSoftwareList,
  openSoftwareConfigEntry,
  openSoftwareConfigInTerminal,
  openResidue,
  saveSettings,
  triggerScan,
  type ConfigNodeDto,
  type SoftwareDetailDto
} from "./api";
import {
  DICTIONARIES,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  detectDefaultLocale,
  normalizeLocale,
  type DictionaryKey,
  type Locale
} from "./i18n";
import { applySoftwareSettings } from "../../shared/software-merge";

// Import utils
import {
  normalizeName,
  hasVisibleName,
  addVisibleName,
  removeVisibleName,
  copyTextToClipboard
} from "./utils";

// Import Components
import { SoftwareTable } from "./components/SoftwareTable";
import { ResidueList } from "./components/ResidueList";
import { AssociateModal } from "./components/AssociateModal";
import { DetailModal } from "./components/DetailModal";
import { SettingsModal, type SortMode } from "./components/SettingsModal";

interface SoftwareEditDraft {
  displayName: string;
  configDir: string;
  installPath: string;
  command: string;
}

function loadLocale(): Locale {
  return detectDefaultLocale();
}

export default function App(): JSX.Element {
  const [allItems, setAllItems] = useState<Software[]>([]);
  const [visibleNames, setVisibleNames] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [locale, setLocale] = useState<Locale>(() => loadLocale());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [manualSoftware, setManualSoftware] = useState<ManualSoftware[]>([]);
  const [softwareOverrides, setSoftwareOverrides] = useState<Record<string, SoftwareOverride>>({});
  const [ignoredResiduePaths, setIgnoredResiduePaths] = useState<string[]>([]);
  const [editingSoftwareName, setEditingSoftwareName] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SoftwareEditDraft>({
    displayName: "",
    configDir: "",
    installPath: "",
    command: ""
  });
  const [newManual, setNewManual] = useState<ManualSoftware>({
    name: "",
    displayName: "",
    configDir: "",
    installPath: "",
    command: ""
  });
  const [scannedAt, setScannedAt] = useState<string>("-");
  const [duration, setDuration] = useState<number>(0);
  const [scanLoading, setScanLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [statusText, setStatusText] = useState("Ready");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [detail, setDetail] = useState<SoftwareDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFullscreen, setDetailFullscreen] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [configRootPath, setConfigRootPath] = useState<string | null>(null);
  const [configRootSize, setConfigRootSize] = useState<number | null>(null);
  const [configChildrenByPath, setConfigChildrenByPath] = useState<Record<string, ConfigNodeDto[]>>({});
  const [configExpandedByPath, setConfigExpandedByPath] = useState<Record<string, boolean>>({});
  const [configLoadingByPath, setConfigLoadingByPath] = useState<Record<string, boolean>>({});
  const [residues, setResidues] = useState<Residue[]>([]);
  const [totalResidueSize, setTotalResidueSize] = useState(0);
  const [residueLoading, setResidueLoading] = useState(false);
  const [associateResiduePath, setAssociateResiduePath] = useState<string | null>(null);
  const [associateSoftwareName, setAssociateSoftwareName] = useState("");
  const [associateSaving, setAssociateSaving] = useState(false);
  const statusPollerRef = useRef<number | null>(null);
  const saveSettingsTimerRef = useRef<number | null>(null);
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());

  async function loadSoftware(): Promise<void> {
    setListLoading(true);
    try {
      const data = await getSoftwareList();
      setAllItems(data.items);
      setScannedAt(data.scannedAt);
      setDuration(data.duration);
    } finally {
      setListLoading(false);
    }
  }

  async function loadResidues(): Promise<void> {
    setResidueLoading(true);
    try {
      const data = await getResidues();
      setResidues(data.items);
      setTotalResidueSize(data.totalSize);
    } finally {
      setResidueLoading(false);
    }
  }

  async function loadSettingsFromServer(): Promise<void> {
    try {
      const data = await getSettings();
      setVisibleNames(data.visibleNames ?? []);
      setSortMode(data.sortMode === "visible_then_name" ? "visible_then_name" : "name");
      setLocale(normalizeLocale(data.locale));
      setManualSoftware(data.manualSoftware ?? []);
      setSoftwareOverrides(data.softwareOverrides ?? {});
      setIgnoredResiduePaths(data.ignoredResiduePaths ?? []);
    } catch {
      // Keep defaults when settings file does not exist yet.
    } finally {
      setSettingsLoaded(true);
    }
  }

  async function queueSettingsSave(payload: Partial<UserSettings>): Promise<void> {
    const run = async () => {
      await saveSettings(payload);
    };
    const next = saveChainRef.current.then(run, run).catch(() => {
      setStatusText(t("failedSaveSettings"));
    });
    saveChainRef.current = next;
    await next;
  }

  useEffect(() => {
    void loadSoftware();
    void loadResidues();
    void loadSettingsFromServer();
    return () => {
      if (statusPollerRef.current !== null) {
        window.clearInterval(statusPollerRef.current);
        statusPollerRef.current = null;
      }
      if (saveSettingsTimerRef.current !== null) {
        window.clearTimeout(saveSettingsTimerRef.current);
        saveSettingsTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (saveSettingsTimerRef.current !== null) {
      window.clearTimeout(saveSettingsTimerRef.current);
      saveSettingsTimerRef.current = null;
    }
    saveSettingsTimerRef.current = window.setTimeout(() => {
      void queueSettingsSave({
        visibleNames,
        sortMode,
        locale,
        manualSoftware,
        softwareOverrides,
        ignoredResiduePaths
      });
    }, 250);
  }, [visibleNames, sortMode, locale, manualSoftware, softwareOverrides, ignoredResiduePaths, settingsLoaded]);

  const dict = DICTIONARIES[locale];
  const t = (key: DictionaryKey): string => dict[key];

  useEffect(() => {
    setStatusText((current) => {
      if (current.startsWith("Scanning") || current.startsWith("扫描中")) {
        return `${t("scanning")} (0%)`;
      }
      return t("ready");
    });
  }, [locale]);

  const mergedForSettings = applySoftwareSettings(allItems, manualSoftware, softwareOverrides);

  const displayItems = mergedForSettings
    .filter((item) => hasVisibleName(visibleNames, item.name))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const settingsItems = [...mergedForSettings].sort((a, b) => {
    if (sortMode === "name") {
      return a.displayName.localeCompare(b.displayName);
    }
    const aVisible = hasVisibleName(visibleNames, a.name) ? 1 : 0;
    const bVisible = hasVisibleName(visibleNames, b.name) ? 1 : 0;
    if (aVisible !== bVisible) {
      return bVisible - aVisible;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const normalizedSearch = settingsSearch.trim().toLowerCase();
  const filteredSettingsItems = settingsItems.filter((item) => {
    if (!normalizedSearch) return true;
    return (
      item.displayName.toLowerCase().includes(normalizedSearch) ||
      item.name.toLowerCase().includes(normalizedSearch)
    );
  });

  async function onScan(): Promise<void> {
    if (statusPollerRef.current !== null) {
      window.clearInterval(statusPollerRef.current);
      statusPollerRef.current = null;
    }

    setStatusText(`${t("scanning")} (0%)`);
    setScanLoading(true);

    statusPollerRef.current = window.setInterval(() => {
      void getScanStatus()
        .then((status) => {
          if (status.scanning) {
            setStatusText(`${t("scanning")} (${status.progress ?? 0}%)`);
            return;
          }
          setStatusText(t("ready"));
          if (statusPollerRef.current !== null) {
            window.clearInterval(statusPollerRef.current);
            statusPollerRef.current = null;
          }
        })
        .catch(() => {
          if (statusPollerRef.current !== null) {
            window.clearInterval(statusPollerRef.current);
            statusPollerRef.current = null;
          }
        });
    }, 1000);

    try {
      await triggerScan();
      await Promise.all([loadSoftware(), loadResidues()]);
      setStatusText(t("ready"));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedScan"));
    } finally {
      if (statusPollerRef.current !== null) {
        window.clearInterval(statusPollerRef.current);
        statusPollerRef.current = null;
      }
      setScanLoading(false);
    }
  }

  async function onOpenDetail(software: Software): Promise<void> {
    setDetailOpen(true);
    setDetailFullscreen(false);
    setSelectedName(software.name);
    setDetailLoading(true);
    setConfigRootPath(null);
    setConfigRootSize(null);
    setConfigChildrenByPath({});
    setConfigExpandedByPath({});
    setConfigLoadingByPath({});
    try {
      const data = await getSoftwareDetail(software.name);
      setDetail(data);
      if (data.software.configDir) {
        const rootPath = data.software.configDir;
        setConfigRootPath(rootPath);
        setConfigExpandedByPath({ [rootPath]: true });
        setConfigLoadingByPath({ [rootPath]: true });
        try {
          const rootData = await getSoftwareConfigChildren(data.software.name, rootPath);
          setConfigRootPath(rootData.root ?? rootPath);
          setConfigChildrenByPath({ [rootPath]: rootData.items });
          setConfigRootSize(rootData.items.reduce((sum, item) => sum + item.size, 0));
        } finally {
          setConfigLoadingByPath((prev) => ({ ...prev, [rootPath]: false }));
        }
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function onOpenResidue(path: string): Promise<void> {
    try {
      await openResidue(path);
      setStatusText(t("openedInFinder"));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedOpenFolder"));
    }
  }

  function onToggleVisible(name: string): void {
    setVisibleNames((prev) =>
      hasVisibleName(prev, name) ? removeVisibleName(prev, name) : addVisibleName(prev, name)
    );
  }

  function onRemoveFromHomepage(name: string): void {
    setVisibleNames((prev) => removeVisibleName(prev, name));
    setStatusText(t("removedFromHomepage"));
  }

  function onStartEditSoftware(software: Software): void {
    setEditingSoftwareName(software.name);
    const override = softwareOverrides[software.name] ?? {};
    const manual = manualSoftware.find(
      (item) => normalizeName(item.name) === normalizeName(software.name)
    );
    setEditDraft({
      displayName: override.displayName ?? software.displayName ?? "",
      configDir: override.configDir ?? software.configDir ?? "",
      installPath: override.installPath ?? software.installPath ?? "",
      command: override.command ?? manual?.command ?? ""
    });
  }

  function onCancelEditSoftware(): void {
    setEditingSoftwareName(null);
    setEditDraft({ displayName: "", configDir: "", installPath: "", command: "" });
  }

  function onSaveEditSoftware(name: string): void {
    const nextOverride: SoftwareOverride = {
      displayName: editDraft.displayName.trim() || undefined,
      configDir: editDraft.configDir.trim() || undefined,
      installPath: editDraft.installPath.trim() || undefined,
      command: editDraft.command.trim() || undefined
    };
    const isManual = manualSoftware.some((item) => normalizeName(item.name) === normalizeName(name));
    if (isManual) {
      setManualSoftware((prev) =>
        prev.map((item) =>
          normalizeName(item.name) === normalizeName(name)
            ? {
                ...item,
                displayName: nextOverride.displayName,
                configDir: nextOverride.configDir,
                installPath: nextOverride.installPath,
                command: editDraft.command.trim() || undefined
              }
            : item
        )
      );
    } else {
      setSoftwareOverrides((prev) => ({ ...prev, [name]: nextOverride }));
    }
    onCancelEditSoftware();
  }

  function onDeleteManualSoftware(name: string): void {
    setManualSoftware((prev) =>
      prev.filter((item) => normalizeName(item.name) !== normalizeName(name))
    );
    setSoftwareOverrides((prev) => {
      const next: Record<string, SoftwareOverride> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (normalizeName(key) === normalizeName(name)) {
          continue;
        }
        next[key] = value;
      }
      return next;
    });
    setVisibleNames((prev) => removeVisibleName(prev, name));
    if (editingSoftwareName && normalizeName(editingSoftwareName) === normalizeName(name)) {
      onCancelEditSoftware();
    }
  }

  function onAddManualSoftware(): void {
    const name = (newManual.name ?? "").trim();
    if (!name) return;
    const exists = mergedForSettings.some(
      (item) => normalizeName(item.name) === normalizeName(name)
    );
    if (!exists) {
      setVisibleNames((prev) => addVisibleName(prev, name));
    }
    setManualSoftware((prev) => {
      const filtered = prev.filter((item) => normalizeName(item.name) !== normalizeName(name));
      return [
        ...filtered,
        {
          name,
          displayName: newManual.displayName?.trim() || name,
          configDir: newManual.configDir?.trim() || undefined,
          installPath: newManual.installPath?.trim() || undefined,
          command: newManual.command?.trim() || undefined
        }
      ];
    });
    setNewManual({
      name: "",
      displayName: "",
      configDir: "",
      installPath: "",
      command: ""
    });
  }

  function onIgnoreResidue(path: string): void {
    setIgnoredResiduePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setResidues((prev) => {
      const removed = prev.find((item) => item.path === path);
      if (removed) {
        setTotalResidueSize((sizePrev) => Math.max(0, sizePrev - removed.size));
      }
      return prev.filter((item) => item.path !== path);
    });
  }

  function onUnignoreResidue(path: string): void {
    setIgnoredResiduePaths((prev) => prev.filter((item) => item !== path));
  }

  function onStartAssociateResidue(path: string, residueSoftwareName: string): void {
    const matched = settingsItems.find(
      (item) => normalizeName(item.name) === normalizeName(residueSoftwareName)
    );
    const fallback = settingsItems[0];
    setAssociateSoftwareName(matched?.name ?? fallback?.name ?? "");
    setAssociateResiduePath(path);
  }

  function onCancelAssociateResidue(): void {
    if (associateSaving) return;
    setAssociateResiduePath(null);
    setAssociateSoftwareName("");
  }

  async function onConfirmAssociateResidue(): Promise<void> {
    if (!associateResiduePath || !associateSoftwareName) return;
    const associateInput = associateSoftwareName.trim();
    let target = settingsItems.find(
      (item) => normalizeName(item.name) === normalizeName(associateInput)
    );
    if (!target) {
      const sameDisplayName = settingsItems.filter(
        (item) => normalizeName(item.displayName) === normalizeName(associateInput)
      );
      if (sameDisplayName.length > 1) {
        setStatusText(t("associateAmbiguous"));
        return;
      }
      target = sameDisplayName[0];
    }
    if (!target) {
      setStatusText(t("failedAssociateResidue"));
      return;
    }

    const manualIdx = manualSoftware.findIndex(
      (item) => normalizeName(item.name) === normalizeName(target.name)
    );
    const existingManual = manualIdx >= 0 ? manualSoftware[manualIdx] : null;
    const existingOverride = softwareOverrides[target.name] ?? {};
    const existingConfigDir = existingManual?.configDir ?? existingOverride.configDir ?? target.configDir;
    const nextConfigDir = associateResiduePath;
    if (existingConfigDir && existingConfigDir.trim() !== nextConfigDir.trim()) {
      const confirmed = window.confirm(
        `${t("overwriteConfigConfirm")}\n${target.displayName}\n${existingConfigDir}\n→ ${nextConfigDir}`
      );
      if (!confirmed) return;
    }

    const nextManualSoftware = [...manualSoftware];
    const nextSoftwareOverrides: Record<string, SoftwareOverride> = { ...softwareOverrides };

    if (manualIdx >= 0) {
      nextManualSoftware[manualIdx] = {
        ...nextManualSoftware[manualIdx],
        configDir: nextConfigDir
      };
    } else {
      nextSoftwareOverrides[target.name] = {
        ...nextSoftwareOverrides[target.name],
        configDir: nextConfigDir
      };
    }

    setAssociateSaving(true);
    try {
      setManualSoftware(nextManualSoftware);
      setSoftwareOverrides(nextSoftwareOverrides);
      await queueSettingsSave({
        visibleNames,
        sortMode,
        locale,
        manualSoftware: nextManualSoftware,
        softwareOverrides: nextSoftwareOverrides,
        ignoredResiduePaths
      });
      await Promise.all([loadSoftware(), loadResidues()]);
      setStatusText(t("associatedResidueSuccess"));
      setAssociateResiduePath(null);
      setAssociateSoftwareName("");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedAssociateResidue"));
    } finally {
      setAssociateSaving(false);
    }
  }

  const associateFilterText = associateSoftwareName.trim().toLowerCase();
  const filteredAssociateItems = settingsItems.filter((software) => {
    if (!associateFilterText) return true;
    return (
      software.displayName.toLowerCase().includes(associateFilterText) ||
      software.name.toLowerCase().includes(associateFilterText)
    );
  });

  async function onToggleConfigDirectory(dirPath: string): Promise<void> {
    const expanded = Boolean(configExpandedByPath[dirPath]);
    if (expanded) {
      setConfigExpandedByPath((prev) => ({ ...prev, [dirPath]: false }));
      return;
    }
    setConfigExpandedByPath((prev) => ({ ...prev, [dirPath]: true }));
    if (!detail) return;
    
    setConfigLoadingByPath((prev) => ({ ...prev, [dirPath]: true }));
    try {
      const data = await getSoftwareConfigChildren(detail.software.name, dirPath);
      setConfigChildrenByPath((prev) => ({ ...prev, [dirPath]: data.items }));
      if (configRootPath && dirPath === configRootPath) {
        setConfigRootSize(data.items.reduce((sum, item) => sum + item.size, 0));
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedLoadConfig"));
      setConfigExpandedByPath((prev) => ({ ...prev, [dirPath]: false }));
    } finally {
      setConfigLoadingByPath((prev) => ({ ...prev, [dirPath]: false }));
    }
  }

  async function onOpenFileFolder(filePath: string): Promise<void> {
    if (!detail) return;
    try {
      await openSoftwareConfigEntry(detail.software.name, filePath);
      setStatusText(t("openedInFinder"));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedOpenFolder"));
    }
  }

  async function onOpenInTerminal(filePath: string): Promise<void> {
    if (!detail) return;
    try {
      await openSoftwareConfigInTerminal(detail.software.name, filePath);
      setStatusText(t("openedInTerminal"));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("failedOpenTerminal"));
    }
  }

  async function onCopyFileName(fileName: string): Promise<void> {
    const copied = await copyTextToClipboard(fileName);
    if (copied) {
      setCopyToast(`${t("copied")}: ${fileName}`);
      window.setTimeout(() => setCopyToast(null), 1200);
    } else {
      setStatusText(t("failedCopy"));
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 md:px-8">
      <section className="fade-in rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-card backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t("appTitle")}
            </p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">{t("machineSnapshot")}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {t("scanStatus")}: <span className="font-semibold">{statusText}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <span>{t("language")}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(normalizeLocale(event.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1"
              >
                {SUPPORTED_LOCALES.map((item) => (
                  <option key={item} value={item}>
                    {LOCALE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("settings")}
            </button>
            <button
              type="button"
              onClick={() => onScan()}
              disabled={scanLoading}
              className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanLoading ? t("scanningBtn") : t("scanNow")}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">{t("software")}</div>
            <div className="mt-1 text-xl font-semibold">
              {displayItems.length}/{mergedForSettings.length}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">{t("lastScan")}</div>
            <div className="mt-1 text-sm font-medium">
              {scannedAt === "-" ? "-" : new Date(scannedAt).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-3">
            <div className="text-xs uppercase tracking-wider text-slate-500">{t("duration")}</div>
            <div className="mt-1 text-xl font-semibold">{duration} ms</div>
          </div>
        </div>
      </section>

      <SoftwareTable
        t={t}
        displayItems={displayItems}
        listLoading={listLoading}
        onOpenDetail={onOpenDetail}
        onRemoveFromHomepage={onRemoveFromHomepage}
      />

      <ResidueList
        t={t}
        residues={residues}
        totalResidueSize={totalResidueSize}
        residueLoading={residueLoading}
        onIgnoreResidue={onIgnoreResidue}
        onStartAssociateResidue={onStartAssociateResidue}
        onOpenResidue={onOpenResidue}
      />

      <AssociateModal
        t={t}
        associateResiduePath={associateResiduePath}
        associateSoftwareName={associateSoftwareName}
        setAssociateSoftwareName={setAssociateSoftwareName}
        filteredAssociateItems={filteredAssociateItems}
        associateSaving={associateSaving}
        onCancelAssociateResidue={onCancelAssociateResidue}
        onConfirmAssociateResidue={onConfirmAssociateResidue}
      />

      <SettingsModal
        t={t}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        newManual={newManual}
        setNewManual={setNewManual}
        onAddManualSoftware={onAddManualSoftware}
        sortMode={sortMode}
        setSortMode={setSortMode}
        settingsSearch={settingsSearch}
        setSettingsSearch={setSettingsSearch}
        allItems={allItems}
        visibleNames={visibleNames}
        filteredSettingsItems={filteredSettingsItems}
        manualSoftware={manualSoftware}
        onStartEditSoftware={onStartEditSoftware}
        onDeleteManualSoftware={onDeleteManualSoftware}
        onToggleVisible={onToggleVisible}
        editingSoftwareName={editingSoftwareName}
        editDraft={editDraft}
        setEditDraft={setEditDraft}
        onSaveEditSoftware={onSaveEditSoftware}
        onCancelEditSoftware={onCancelEditSoftware}
        ignoredResiduePaths={ignoredResiduePaths}
        onUnignoreResidue={onUnignoreResidue}
      />

      <DetailModal
        t={t}
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        detailFullscreen={detailFullscreen}
        setDetailFullscreen={setDetailFullscreen}
        copyToast={copyToast}
        selectedName={selectedName}
        detailLoading={detailLoading}
        detail={detail}
        configRootPath={configRootPath}
        configRootSize={configRootSize}
        configLoadingByPath={configLoadingByPath}
        configExpandedByPath={configExpandedByPath}
        configChildrenByPath={configChildrenByPath}
        onToggleConfigDirectory={onToggleConfigDirectory}
        onOpenFileFolder={onOpenFileFolder}
        onOpenInTerminal={onOpenInTerminal}
        onCopyFileName={onCopyFileName}
      />
    </main>
  );
}
