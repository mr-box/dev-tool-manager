import path from "node:path";
import type { Software } from "../../types.ts";
import { buildSoftware, homeDir, runCommand } from "../utils.ts";

export async function scanPip(): Promise<Software[]> {
  const [output, siteOutput] = await Promise.all([
    runCommand("pip3", ["list", "--format=json"]),
    runCommand("python3", ["-m", "site", "--user-site"])
  ]);

  if (!output) {
    return [];
  }

  const siteDir = siteOutput?.trim() || path.join(homeDir, "Library", "Python");

  try {
    const parsed = JSON.parse(output) as Array<{ name: string; version?: string }>;
    return parsed.map((item) =>
      buildSoftware(item.name, "pip", {
        version: item.version,
        installPath: path.join(siteDir, item.name)
      })
    );
  } catch {
    return [];
  }
}
