import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Dirent } from "node:fs";
import { normalizeSoftwareName } from "../../shared/software-merge.ts";
import { expandHome } from "../path-utils.ts";

export const execFileAsync = promisify(execFile);
export const homeDir = os.homedir();
export const directorySizeCache = new Map<string, number>();

export const TOOL_CONFIG_MAP: Record<string, string> = {
  "Claude Code": "~/.claude",
  Cursor: "~/.cursor",
  "Gemini CLI": "~/.gemini",
  "GitHub Copilot": "~/.copilot",
  Antigravity: "~/.antigravity",
  CodeBuddy: "~/.codebuddy",
  Codex: "~/.codex",
  "iFlow CLI": "~/.iflow",
  "Kilo Code": "~/.kilocode",
  Kiro: "~/.kiro",
  OpenCode: "~/.opencode",
  Qoder: "~/.qoder",
  "Qwen Code": "~/.qwen",
  Trae: "~/.trae",
  "Trae CN": "~/.trae-cn",
  Windsurf: "~/.windsurf",
  Continue: "~/.continue",
  Aider: "~/.aider",
  Tabnine: "~/.tabnine",
  Codeium: "~/.codeium",
  Supermaven: "~/.supermaven",
  MarsCode: "~/.marscode",
  Cody: "~/.cody"
};

export const TOOL_ALIASES: Record<string, string[]> = {
  "Claude Code": ["claude", "claudecode", "@anthropic-ai/claude-code"],
  Cursor: ["cursor"],
  "Gemini CLI": ["gemini", "geminicli", "@google/gemini-cli"],
  "GitHub Copilot": ["copilot", "githubcopilot", "ima.copilot"],
  Antigravity: ["antigravity"],
  CodeBuddy: ["codebuddy"],
  Codex: ["codex", "@openai/codex"],
  "iFlow CLI": ["iflow", "iflowcli", "@iflow-ai/iflow-cli"],
  "Kilo Code": ["kilocode"],
  Kiro: ["kiro"],
  OpenCode: ["opencode"],
  Qoder: ["qoder"],
  "Qwen Code": ["qwen", "qwencode", "@qwen-code/qwen-code"],
  Trae: ["trae"],
  "Trae CN": ["traecn", "trae-cn"],
  Windsurf: ["windsurf"],
  Continue: ["continue"],
  Aider: ["aider"],
  Tabnine: ["tabnine"],
  Codeium: ["codeium"],
  Supermaven: ["supermaven"],
  MarsCode: ["marscode"],
  Cody: ["cody"]
};

export const COMMON_HIDDEN_DIR_EXCLUDES = new Set<string>([
  ".zsh",
  ".oh-my-zsh",
  ".bash",
  ".bash_sessions",
  ".ssh",
  ".gnupg",
  ".config",
  ".cache",
  ".local",
  ".Trash",
  ".vscode",
  ".idea",
  ".npm",
  ".nvm",
  ".pnpm-store",
  ".yarn",
  ".node-gyp",
  ".cargo",
  ".rustup",
  ".android",
  ".gradle",
  ".aws",
  ".azure",
  ".kube"
]);

export const CONFIG_DIR_BY_ALIAS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [toolName, cfgPath] of Object.entries(TOOL_CONFIG_MAP)) {
    const resolvedPath = expandHome(cfgPath);
    map.set(normalizeSoftwareName(toolName), resolvedPath);
    const aliases = TOOL_ALIASES[toolName] ?? [];
    for (const alias of aliases) {
      map.set(normalizeSoftwareName(alias), resolvedPath);
    }
  }
  return map;
})();

export const CANONICAL_TOOL_KEY_BY_ALIAS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [toolName, aliases] of Object.entries(TOOL_ALIASES)) {
    const canonical = normalizeSoftwareName(toolName);
    map.set(canonical, canonical);
    for (const alias of aliases) {
      const normalizedAlias = normalizeSoftwareName(alias);
      if (normalizedAlias) {
        map.set(normalizedAlias, canonical);
      }
      const strippedAlias = normalizeSoftwareName(stripScopePackage(alias));
      if (strippedAlias) {
        map.set(strippedAlias, canonical);
      }
    }
  }
  return map;
})();

export function stripScopePackage(value: string): string {
  const idx = value.lastIndexOf("/");
  return idx >= 0 ? value.slice(idx + 1) : value;
}

export function isPathInRoot(rootPath: string, targetPath: string): boolean {
  const rootResolved = path.resolve(rootPath);
  const targetResolved = path.resolve(targetPath);
  return targetResolved === rootResolved || targetResolved.startsWith(`${rootResolved}${path.sep}`);
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readDirSafe(target: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(target, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return [];
  }
}

export async function runCommand(
  command: string,
  args: string[]
): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout: 8000 });
    return stdout;
  } catch {
    return undefined;
  }
}

export async function runCommandStrict(command: string, args: string[]): Promise<void> {
  await execFileAsync(command, args, { timeout: 8000 });
}

export async function findCommandPath(command: string): Promise<string | undefined> {
  const output = await runCommand("which", [command]);
  const value = output?.trim();
  if (!value) {
    return undefined;
  }
  return value;
}

async function getDirectorySize(target: string): Promise<number> {
  let total = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = await readDirSafe(current);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        try {
          const stat = await fs.stat(fullPath);
          total += stat.size;
        } catch {
          // Ignore files that fail during traversal.
        }
      }
    }
  }
  return total;
}

export async function getDirectorySizeCached(target: string): Promise<number> {
  const resolved = path.resolve(target);
  const cached = directorySizeCache.get(resolved);
  if (cached !== undefined) {
    return cached;
  }
  const size = await getDirectorySize(resolved);
  directorySizeCache.set(resolved, size);
  return size;
}

export function clearScannerCaches(): void {
  directorySizeCache.clear();
}
