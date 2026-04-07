import path from "node:path";
import type { Software } from "../../types.ts";
import { buildSoftware, runCommand } from "../utils.ts";

export async function scanHomebrew(): Promise<Software[]> {
  const [output, prefixOutput] = await Promise.all([
    runCommand("brew", ["list", "--versions"]),
    runCommand("brew", ["--prefix"])
  ]);

  if (!output) {
    return [];
  }

  const prefix = prefixOutput?.trim() || "/opt/homebrew";
  const cellarPath = path.join(prefix, "Cellar");

  const lines = output.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => {
    const [name, ...rest] = line.split(/\s+/);
    const version = rest[0];
    return buildSoftware(name, "homebrew", {
      version,
      installPath: path.join(cellarPath, name)
    });
  });
}

