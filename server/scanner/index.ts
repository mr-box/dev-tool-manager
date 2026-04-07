import type { ConfigFile, ScanResult, Software } from "../types.ts";
import { scanApplications } from "./scanners/applications.ts";
import { scanHomebrew } from "./scanners/homebrew.ts";
import { scanNpm } from "./scanners/npm.ts";
import { scanPip } from "./scanners/pip.ts";
import { scanPathTools, type PathScanHint } from "./scanners/path.ts";
import {
  detectResidues,
  openResidueDirectory,
  type ResidueConfigMapping
} from "../residues.ts";
import {
  CANONICAL_TOOL_KEY_BY_ALIAS,
  clearScannerCaches,
  isPathInRoot,
  pathExists,
  readDirSafe,
  runCommandStrict
} from "./common.ts";
import {
  getDirectorySizeCached,
  stripScopePackage
} from "./utils.ts";
import { normalizeSoftwareName } from "../../shared/software-merge.ts";
import path from "node:path";
import { promises as fs } from "node:fs";

export {
  scanApplications,
  scanHomebrew,
  scanNpm,
  scanPip,
  scanPathTools,
  detectResidues,
  openResidueDirectory,
  clearScannerCaches
};
export type { PathScanHint, ResidueConfigMapping };

let latestScanResult: ScanResult = {
  items: [],
  scannedAt: new Date(0).toISOString(),
  duration: 0
};

function resolveSoftwareDedupeKey(name: string): string {
  const direct = normalizeSoftwareName(name);
  const directCanonical = CANONICAL_TOOL_KEY_BY_ALIAS.get(direct);
  if (directCanonical) {
    return directCanonical;
  }
  const stripped = normalizeSoftwareName(stripScopePackage(name));
  const strippedCanonical = CANONICAL_TOOL_KEY_BY_ALIAS.get(stripped);
  if (strippedCanonical) {
    return strippedCanonical;
  }
  return direct;
}

export async function aggregateScanResults(): Promise<ScanResult> {
  return aggregateScanResultsWithHints();
}

export async function aggregateScanResultsWithHints(
  pathScanHints: PathScanHint[] = []
): Promise<ScanResult> {
  const startedAt = Date.now();
  const settled = await Promise.allSettled([
    scanApplications(),
    scanHomebrew(),
    scanNpm(),
    scanPip(),
    scanPathTools(pathScanHints)
  ]);
  const all = settled
    .filter((result): result is PromiseFulfilledResult<Software[]> => result.status === "fulfilled")
    .flatMap((result) => result.value);
  const byName = new Map<string, Software>();
  for (const item of all) {
    const key = resolveSoftwareDedupeKey(item.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, item);
      continue;
    }
    // Prefer concrete installer detections over PATH-only detections.
    if (existing.installMethod !== "unknown" && item.installMethod === "unknown") {
      continue;
    }
    if (existing.installMethod === "unknown" && item.installMethod !== "unknown") {
      byName.set(key, {
        ...item,
        displayName: existing.displayName || item.displayName,
        version: item.version ?? existing.version,
        installPath: item.installPath ?? existing.installPath,
        configDir: item.configDir ?? existing.configDir
      });
      continue;
    }
    byName.set(key, {
      ...existing,
      ...item,
      version: existing.version ?? item.version,
      installPath: existing.installPath ?? item.installPath,
      configDir: existing.configDir ?? item.configDir
    });
  }

  latestScanResult = {
    items: Array.from(byName.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    ),
    scannedAt: new Date().toISOString(),
    duration: Date.now() - startedAt
  };
  return latestScanResult;
}

export function getLatestScanResult(): ScanResult {
  return latestScanResult;
}

export async function listConfigDirectory(
  software: Software,
  targetPath?: string
): Promise<{ root: string; path: string; items: ConfigFile[] }> {
  if (!software.configDir) {
    throw new Error("No config directory for this software");
  }

  const root = software.configDir;
  const currentPath = targetPath ? path.resolve(targetPath) : root;
  if (!isPathInRoot(root, currentPath)) {
    throw new Error("Requested path is outside config root");
  }
  if (!(await pathExists(currentPath))) {
    throw new Error("Requested path does not exist");
  }

  const entries = await readDirSafe(currentPath);
  const items: ConfigFile[] = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(currentPath, entry.name);
      let size = 0;
      if (entry.isDirectory()) {
        size = await getDirectorySizeCached(fullPath);
      } else {
        try {
          const stat = await fs.stat(fullPath);
          size = stat.size;
        } catch {
          size = 0;
        }
      }
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size
      };
    })
  );

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return { root, path: currentPath, items };
}

export async function openConfigEntryInFinder(
  software: Software,
  targetPath: string
): Promise<void> {
  if (!software.configDir) {
    throw new Error("No config directory for this software");
  }
  const resolved = path.resolve(targetPath);
  if (!isPathInRoot(software.configDir, resolved)) {
    throw new Error("Requested path is outside config root");
  }

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error("Requested path does not exist");
  }

  if (stat.isDirectory()) {
    await runCommandStrict("open", [resolved]);
    return;
  }
  await runCommandStrict("open", ["-R", resolved]);
}

export async function openConfigEntryInTerminal(
  software: Software,
  targetPath: string
): Promise<void> {
  if (!software.configDir) {
    throw new Error("No config directory for this software");
  }
  const resolved = path.resolve(targetPath);
  if (!isPathInRoot(software.configDir, resolved)) {
    throw new Error("Requested path is outside config root");
  }

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error("Requested path does not exist");
  }

  const targetDir = stat.isDirectory() ? resolved : path.dirname(resolved);
  await runCommandStrict("open", ["-a", "Terminal", targetDir]);
}
