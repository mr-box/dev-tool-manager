import type { Software } from "./api-contract.js";

export interface SoftwareMergeManualItem {
  name: string;
  displayName?: string;
  configDir?: string;
  installPath?: string;
}

export interface SoftwareMergeOverrideItem {
  displayName?: string;
  configDir?: string;
  installPath?: string;
}

export function normalizeSoftwareName(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function toSoftwareFromManual(item: SoftwareMergeManualItem): Software {
  return {
    name: item.name,
    displayName: item.displayName?.trim() || item.name,
    installMethod: "unknown",
    installPath: item.installPath,
    configDir: item.configDir
  };
}

export function applySoftwareSettings(
  rawItems: Software[],
  manualSoftware: SoftwareMergeManualItem[],
  softwareOverrides: Record<string, SoftwareMergeOverrideItem>
): Software[] {
  const map = new Map<string, Software>();

  for (const item of rawItems) {
    map.set(normalizeSoftwareName(item.name), item);
  }

  for (const manual of manualSoftware) {
    const key = normalizeSoftwareName(manual.name);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        displayName: manual.displayName || existing.displayName,
        configDir: manual.configDir || existing.configDir,
        installPath: manual.installPath || existing.installPath
      });
      continue;
    }
    map.set(key, toSoftwareFromManual(manual));
  }

  for (const [name, override] of Object.entries(softwareOverrides)) {
    const key = normalizeSoftwareName(name);
    const existing = map.get(key);
    if (!existing) {
      continue;
    }
    map.set(key, {
      ...existing,
      displayName: override.displayName || existing.displayName,
      configDir: override.configDir || existing.configDir,
      installPath: override.installPath || existing.installPath
    });
  }

  return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
