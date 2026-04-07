import path from "node:path";
import { promises as fs } from "node:fs";
import { normalizeSoftwareName } from "../shared/software-merge.ts";
import { expandHome } from "./path-utils.ts";
import type { Residue, ResidueResult, Software } from "./types.ts";
import {
  COMMON_HIDDEN_DIR_EXCLUDES,
  TOOL_CONFIG_MAP,
  TOOL_ALIASES,
  getDirectorySizeCached,
  homeDir,
  pathExists,
  readDirSafe,
  runCommand,
  runCommandStrict,
  stripScopePackage
} from "./scanner/common.ts";

export interface ResidueConfigMapping {
  softwareName: string;
  configDir: string;
  aliases?: string[];
}

interface InstallationContext {
  installedConfigDirs: Set<string>;
  installedAppNameNorms: Set<string>;
  installedNameNorms: string[];
  commandExistsCache: Map<string, boolean>;
}

async function commandExists(command: string, cache: Map<string, boolean>): Promise<boolean> {
  const normalized = command.trim().toLowerCase();
  if (!normalized || !/^[a-z0-9._-]+$/.test(normalized)) {
    return false;
  }
  if (cache.has(normalized)) {
    return cache.get(normalized) ?? false;
  }
  const output = await runCommand("which", [normalized]);
  const ok = Boolean(output && output.trim());
  cache.set(normalized, ok);
  return ok;
}

function checkAliasOverlap(aliases: string[], targets: Iterable<string>): boolean {
  for (const alias of aliases) {
    for (const target of targets) {
      if (target === alias) {
        return true;
      }
      if (alias.length >= 4 && target.includes(alias)) {
        return true;
      }
    }
  }
  return false;
}

async function hasInstalledSignal(
  toolName: string,
  configPath: string,
  extraAliases: string[],
  ctx: InstallationContext
): Promise<boolean> {
  const normalizedResolvedPath = path.resolve(configPath);
  if (ctx.installedConfigDirs.has(normalizedResolvedPath)) {
    return true;
  }

  const aliases = [toolName, ...(TOOL_ALIASES[toolName] ?? []), ...extraAliases]
    .map((item) => normalizeSoftwareName(stripScopePackage(item)))
    .filter(Boolean);

  if (checkAliasOverlap(aliases, ctx.installedAppNameNorms)) return true;
  if (checkAliasOverlap(aliases, ctx.installedNameNorms)) return true;

  for (const alias of aliases) {
    if (await commandExists(alias, ctx.commandExistsCache)) {
      return true;
    }
  }

  return false;
}

export async function detectResidues(
  installed: Software[],
  customMappings: ResidueConfigMapping[] = []
): Promise<ResidueResult> {
  const ctx: InstallationContext = {
    installedConfigDirs: new Set(
      installed
        .map((item) => item.configDir)
        .filter((value): value is string => Boolean(value))
        .map((value) => path.resolve(value))
    ),
    installedNameNorms: installed.map((item) => normalizeSoftwareName(stripScopePackage(item.name))),
    installedAppNameNorms: new Set<string>(),
    commandExistsCache: new Map<string, boolean>()
  };

  const residues: Residue[] = [];

  for (const appDir of ["/Applications", path.join(homeDir, "Applications")]) {
    const entries = await readDirSafe(appDir);
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith(".app")) {
        continue;
      }
      const appName = entry.name.replace(/\.app$/i, "");
      ctx.installedAppNameNorms.add(normalizeSoftwareName(appName));
    }
  }

  const mergedMappings = new Map<string, ResidueConfigMapping>();
  for (const [softwareName, configuredPath] of Object.entries(TOOL_CONFIG_MAP)) {
    const key = normalizeSoftwareName(softwareName);
    mergedMappings.set(key, {
      softwareName,
      configDir: expandHome(configuredPath),
      aliases: TOOL_ALIASES[softwareName] ?? []
    });
  }
  for (const mapping of customMappings) {
    const name = mapping.softwareName.trim();
    const configDir = mapping.configDir.trim();
    if (!name || !configDir) {
      continue;
    }
    const key = normalizeSoftwareName(name);
    const existing = mergedMappings.get(key);
    mergedMappings.set(key, {
      softwareName: name,
      configDir: expandHome(configDir),
      aliases: [
        ...(existing?.aliases ?? []),
        ...(mapping.aliases ?? [])
      ]
    });
  }

  const mappedPaths = new Set<string>(
    Array.from(mergedMappings.values()).map((item) => path.resolve(item.configDir))
  );
  const hiddenAutoMappings: ResidueConfigMapping[] = [];
  const homeEntries = await readDirSafe(homeDir);
  for (const entry of homeEntries) {
    if (!entry.isDirectory() || !entry.name.startsWith(".")) {
      continue;
    }
    if (COMMON_HIDDEN_DIR_EXCLUDES.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(homeDir, entry.name);
    const resolved = path.resolve(fullPath);
    if (mappedPaths.has(resolved)) {
      continue;
    }
    const displayName = entry.name.replace(/^\./, "") || entry.name;
    hiddenAutoMappings.push({
      softwareName: displayName,
      configDir: resolved,
      aliases: [displayName, entry.name]
    });
    mappedPaths.add(resolved);
  }

  const residuePathSeen = new Set<string>();
  for (const mapping of [...mergedMappings.values(), ...hiddenAutoMappings]) {
    const resolvedPath = path.resolve(mapping.configDir);
    if (residuePathSeen.has(resolvedPath)) {
      continue;
    }
    if (
      await hasInstalledSignal(
        mapping.softwareName,
        resolvedPath,
        mapping.aliases ?? [],
        ctx
      )
    ) {
      continue;
    }
    if (!(await pathExists(resolvedPath))) {
      continue;
    }
    residuePathSeen.add(resolvedPath);
    const lower = resolvedPath.toLowerCase();
    const basename = path.basename(lower);
    let type: Residue["type"] = "data";
    if (lower.includes("cache")) {
      type = "cache";
    } else if (lower.includes("log")) {
      type = "log";
    } else if (basename.startsWith(".") || lower.includes("config") || lower.includes("conf")) {
      type = "config";
    }
    residues.push({
      softwareName: mapping.softwareName,
      path: resolvedPath,
      size: await getDirectorySizeCached(resolvedPath),
      type
    });
  }

  const totalSize = residues.reduce((total, residue) => total + residue.size, 0);
  return {
    items: residues.sort((a, b) => b.size - a.size),
    totalSize
  };
}

export async function openResidueDirectory(targetPath: string): Promise<void> {
  const resolved = path.resolve(targetPath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error("Requested path does not exist");
  }
  if (!stat.isDirectory()) {
    throw new Error("Requested path is not a directory");
  }
  await runCommandStrict("open", [resolved]);
}
