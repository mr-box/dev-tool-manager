import path from "node:path";
import { normalizeSoftwareName } from "../../shared/software-merge.ts";
import type { Software } from "../types.ts";
import {
  CONFIG_DIR_BY_ALIAS,
  homeDir,
  pathExists,
  readDirSafe,
  runCommand,
  runCommandStrict,
  findCommandPath,
  getDirectorySizeCached,
  stripScopePackage
} from "./common.ts";

export {
  homeDir,
  pathExists,
  readDirSafe,
  runCommand,
  runCommandStrict,
  findCommandPath,
  getDirectorySizeCached,
  stripScopePackage
};

export function guessConfigDir(name: string, installPath?: string): string | undefined {
  const candidates = new Set<string>();
  const raw = [name, stripScopePackage(name)];
  if (installPath) {
    raw.push(path.basename(installPath), stripScopePackage(path.basename(installPath)));
  }

  for (const item of raw) {
    const n = normalizeSoftwareName(item);
    if (!n) {
      continue;
    }
    candidates.add(n);
    for (const alias of CONFIG_DIR_BY_ALIAS.keys()) {
      if (alias.length >= 4 && n.includes(alias)) {
        candidates.add(alias);
      }
    }
  }

  for (const candidate of candidates) {
    const cfg = CONFIG_DIR_BY_ALIAS.get(candidate);
    if (cfg) {
      return cfg;
    }
  }
  return undefined;
}

export function buildSoftware(
  name: string,
  installMethod: Software["installMethod"],
  partial: Partial<Software> = {}
): Software {
  const configDir = partial.configDir ?? guessConfigDir(name, partial.installPath);
  return {
    name,
    displayName: name,
    installMethod,
    configDir,
    ...partial
  };
}
