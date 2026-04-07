// API contract types shared between client and server

export type InstallMethod = "dmg" | "homebrew" | "npm" | "pip" | "unknown";
export type ResidueType = "config" | "cache" | "log" | "data";

export interface Software {
  name: string;
  displayName: string;
  version?: string;
  installMethod: InstallMethod;
  installPath?: string;
  configDir?: string;
}

export interface ConfigFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export interface Residue {
  softwareName: string;
  path: string;
  size: number;
  type: ResidueType;
}

export interface ScanResult {
  items: Software[];
  scannedAt: string;
  duration: number;
}

export interface ResidueResult {
  items: Residue[];
  totalSize: number;
}

export interface ApiOk<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface ManualSoftware {
  name: string;
  displayName?: string;
  configDir?: string;
  installPath?: string;
  command?: string;
}

export interface SoftwareOverride {
  displayName?: string;
  configDir?: string;
  installPath?: string;
  command?: string;
}

export interface UserSettings {
  visibleNames: string[];
  sortMode: "name" | "visible_then_name";
  locale: "en" | "zh-CN";
  manualSoftware: ManualSoftware[];
  softwareOverrides: Record<string, SoftwareOverride>;
  ignoredResiduePaths: string[];
}
