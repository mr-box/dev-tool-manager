import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { UserSettings, ManualSoftware, SoftwareOverride } from "../shared/api-contract.ts";

export type { UserSettings, ManualSoftware, SoftwareOverride };

const SETTINGS_DIR = path.join(os.homedir(), ".dev-tool-manager");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

const DEFAULT_SETTINGS: UserSettings = {
  visibleNames: [],
  sortMode: "name",
  locale: "en",
  manualSoftware: [],
  softwareOverrides: {},
  ignoredResiduePaths: []
};

export function normalizeSettings(input: unknown): UserSettings {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const raw = input as Partial<UserSettings>;
  const visibleNamesMap = new Map<string, string>();
  if (Array.isArray(raw.visibleNames)) {
    for (const item of raw.visibleNames) {
      if (typeof item !== "string") {
        continue;
      }
      const name = item.trim();
      if (!name) {
        continue;
      }
      const key = name.toLowerCase().replace(/[\s_-]+/g, "");
      if (!visibleNamesMap.has(key)) {
        visibleNamesMap.set(key, name);
      }
    }
  }
  const visibleNames = Array.from(visibleNamesMap.values());
  const sortMode = raw.sortMode === "visible_then_name" ? "visible_then_name" : "name";
  const locale = raw.locale === "zh-CN" ? "zh-CN" : "en";
  const manualSoftware: ManualSoftware[] = [];
  if (Array.isArray(raw.manualSoftware)) {
    for (const item of raw.manualSoftware) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const data = item as Partial<ManualSoftware>;
      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!name) {
        continue;
      }
      manualSoftware.push({
        name,
        displayName: typeof data.displayName === "string" ? data.displayName.trim() : undefined,
        configDir: typeof data.configDir === "string" ? data.configDir.trim() : undefined,
        installPath: typeof data.installPath === "string" ? data.installPath.trim() : undefined,
        command: typeof data.command === "string" ? data.command.trim() : undefined
      });
    }
  }

  const softwareOverrides: Record<string, SoftwareOverride> = {};
  if (raw.softwareOverrides && typeof raw.softwareOverrides === "object") {
    for (const [name, override] of Object.entries(raw.softwareOverrides)) {
      if (!override || typeof override !== "object") {
        continue;
      }
      const data = override as Partial<SoftwareOverride>;
      softwareOverrides[name] = {
        displayName: typeof data.displayName === "string" ? data.displayName.trim() : undefined,
        configDir: typeof data.configDir === "string" ? data.configDir.trim() : undefined,
        installPath: typeof data.installPath === "string" ? data.installPath.trim() : undefined,
        command: typeof data.command === "string" ? data.command.trim() : undefined
      };
    }
  }

  const ignoredResiduePaths: string[] = [];
  if (Array.isArray(raw.ignoredResiduePaths)) {
    const seen = new Set<string>();
    for (const item of raw.ignoredResiduePaths) {
      if (typeof item !== "string") {
        continue;
      }
      const value = item.trim();
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      ignoredResiduePaths.push(value);
    }
  }

  return { visibleNames, sortMode, locale, manualSoftware, softwareOverrides, ignoredResiduePaths };
}

export async function readSettings(): Promise<UserSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settings: UserSettings): Promise<UserSettings> {
  const normalized = normalizeSettings(settings);
  await fs.mkdir(SETTINGS_DIR, { recursive: true });
  const payload = `${JSON.stringify(normalized, null, 2)}\n`;
  const tempFile = path.join(SETTINGS_DIR, `settings.tmp.${randomBytes(4).toString("hex")}`);
  await fs.writeFile(tempFile, payload, "utf8");
  await fs.rename(tempFile, SETTINGS_FILE);
  return normalized;
}
