import type { SoftwareDetailDto, ConfigNodeDto } from "../api";
import { formatBytes } from "../utils";

interface DetailModalProps {
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  detailFullscreen: boolean;
  setDetailFullscreen: (fn: (prev: boolean) => boolean) => void;
  copyToast: string | null;
  t: (key: any) => string;
  selectedName: string | null;
  detailLoading: boolean;
  detail: SoftwareDetailDto | null;
  configRootPath: string | null;
  configRootSize: number | null;
  configLoadingByPath: Record<string, boolean>;
  configExpandedByPath: Record<string, boolean>;
  configChildrenByPath: Record<string, ConfigNodeDto[]>;
  onToggleConfigDirectory: (path: string) => void;
  onOpenFileFolder: (path: string) => void;
  onOpenInTerminal: (path: string) => void;
  onCopyFileName: (name: string) => void;
}

export function DetailModal({
  detailOpen,
  setDetailOpen,
  detailFullscreen,
  setDetailFullscreen,
  copyToast,
  t,
  selectedName,
  detailLoading,
  detail,
  configRootPath,
  configRootSize,
  configLoadingByPath,
  configExpandedByPath,
  configChildrenByPath,
  onToggleConfigDirectory,
  onOpenFileFolder,
  onOpenInTerminal,
  onCopyFileName
}: DetailModalProps) {
  if (!detailOpen) return null;

  function renderConfigNodes(parentPath: string, depth = 0): JSX.Element[] {
    const nodes = configChildrenByPath[parentPath] ?? [];
    const elements: JSX.Element[] = [];
    for (const node of nodes) {
      const expanded = Boolean(configExpandedByPath[node.path]);
      elements.push(
        <div key={node.path}>
          {node.isDirectory ? (
            <button
              type="button"
              onClick={() => onToggleConfigDirectory(node.path)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <span className="w-4 text-xs text-slate-500">{expanded ? "▾" : "▸"}</span>
              <span className="truncate">
                {node.name} ({formatBytes(node.size)})
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <>
                <span className="w-4 text-xs text-slate-500">•</span>
                <button
                  type="button"
                  onClick={() => onCopyFileName(node.name)}
                  className="truncate text-left text-slate-700 underline-offset-2 hover:underline"
                  title={t("copyFileName")}
                >
                  {node.name} ({formatBytes(node.size)})
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenInTerminal(node.path)}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                    title="Open containing directory in Terminal"
                  >
                    {t("terminalAction")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenFileFolder(node.path)}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                    title="Open containing folder in Finder"
                  >
                    {t("finderAction")}
                  </button>
                </div>
              </>
            </div>
          )}
          {node.isDirectory && expanded && configLoadingByPath[node.path] && (
            <div className="px-2 py-1 text-xs text-slate-500" style={{ paddingLeft: `${depth * 14 + 30}px` }}>
              {t("loadingEllipsis")}
            </div>
          )}
          {node.isDirectory && expanded && !configLoadingByPath[node.path] && renderConfigNodes(node.path, depth + 1)}
        </div>
      );
    }
    return elements;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className={`relative w-full rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl ${
          detailFullscreen ? "max-h-[92vh] max-w-[96vw]" : "max-w-4xl"
        }`}
      >
        {copyToast && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow">
            {copyToast}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{t("softwareDetail")}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailFullscreen((prev) => !prev)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {detailFullscreen ? t("exitFullscreen") : t("fullscreen")}
            </button>
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("close")}
            </button>
          </div>
        </div>

        {!selectedName && <p className="text-sm text-slate-600">{t("noSoftwareSelected")}</p>}
        {detailLoading && <p className="text-sm text-slate-600">{t("loadingDetail")}</p>}
        {!detailLoading && detail && (
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("name")}</div>
              <div className="mt-1 font-semibold">{detail.software.displayName}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("installPath")}</div>
              <code className="mt-1 block break-all text-xs">{detail.software.installPath ?? "-"}</code>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-slate-50 p-3 md:col-span-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("configRootDirectory")}</div>
              <code className="mt-1 block break-all text-xs">
                {configRootPath ?? detail.software.configDir ?? "-"}
                {configRootSize !== null ? ` (${formatBytes(configRootSize)})` : ""}
              </code>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-white p-3 md:col-span-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">{t("config")}</div>
              <div
                className="mt-2 overflow-auto rounded border border-[var(--line)] p-2"
                style={{
                  maxHeight: detailFullscreen ? "calc(92vh - 290px)" : "calc(80vh - 300px)"
                }}
              >
                {!configRootPath ? (
                  <p className="text-xs text-slate-500">{t("noConfigRoot")}</p>
                ) : configLoadingByPath[configRootPath] ? (
                  <p className="text-xs text-slate-500">{t("loading")}</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggleConfigDirectory(configRootPath)}
                      className="mb-1 flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                    >
                      <span className="w-4 text-xs text-slate-500">
                        {configExpandedByPath[configRootPath] ? "▾" : "▸"}
                      </span>
                      <span className="truncate font-medium">{configRootPath}</span>
                    </button>
                    {configExpandedByPath[configRootPath] &&
                      (configChildrenByPath[configRootPath]?.length ? (
                        renderConfigNodes(configRootPath, 1)
                      ) : (
                        <p className="px-2 py-1 text-xs text-slate-500">{t("emptyDirectory")}</p>
                      ))}
                  </>
                )}
                {configRootPath && !configExpandedByPath[configRootPath] && (
                  <p className="text-xs text-slate-500">{t("clickRootToExpand")}</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
