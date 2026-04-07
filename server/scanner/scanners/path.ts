import type { Software } from "../../types.ts";
import { TOOL_ALIASES } from "../common.ts";
import {
  buildSoftware,
  findCommandPath,
  stripScopePackage
} from "../utils.ts";

interface PathScanHint {
  name: string;
  command: string;
}

export async function scanPathTools(hints: PathScanHint[] = []): Promise<Software[]> {
  const items: Software[] = [];
  const checkedCommands = new Set<string>();
  const hintByCommand = new Map<string, string>();
  for (const hint of hints) {
    const normalized = hint.command.trim().toLowerCase();
    if (!normalized || !/^[a-z0-9._-]+$/i.test(normalized)) {
      continue;
    }
    hintByCommand.set(normalized, hint.name.trim() || hint.command.trim());
  }

  for (const [command, name] of hintByCommand.entries()) {
    checkedCommands.add(command);
    const commandPath = await findCommandPath(command);
    if (!commandPath) {
      continue;
    }
    items.push(
      buildSoftware(name, "unknown", {
        displayName: name,
        installPath: commandPath
      })
    );
  }

  for (const [toolName, toolAliases] of Object.entries(TOOL_ALIASES)) {
    const commandCandidates = (toolAliases as string[])
      .map((alias: string) => stripScopePackage(alias))
      .filter((alias: string) => /^[a-z0-9._-]+$/i.test(alias));
    for (const command of commandCandidates) {
      const normalized = command.toLowerCase();
      if (checkedCommands.has(normalized)) {
        continue;
      }
      checkedCommands.add(normalized);
      const commandPath = await findCommandPath(command);
      if (!commandPath) {
        continue;
      }
      items.push(
        buildSoftware(toolName, "unknown", {
          displayName: toolName,
          installPath: commandPath
        })
      );
      break;
    }
  }
  return items;
}

export type { PathScanHint };
