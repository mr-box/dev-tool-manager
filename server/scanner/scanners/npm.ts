import path from "node:path";
import type { Software } from "../../types.ts";
import { buildSoftware, homeDir, runCommand } from "../utils.ts";

export async function scanNpm(): Promise<Software[]> {
  const [output, rootOutput] = await Promise.all([
    runCommand("npm", ["list", "-g", "--depth=0", "--json"]),
    runCommand("npm", ["root", "-g"])
  ]);

  if (!output) {
    return [];
  }

  const npmRoot = rootOutput?.trim() || path.join(homeDir, ".npm-global", "lib", "node_modules");

  try {
    const parsed = JSON.parse(output) as {
      dependencies?: Record<string, { version?: string }>;
    };
    const deps = parsed.dependencies ?? {};
    return Object.entries(deps).map(([name, metadata]) =>
      buildSoftware(name, "npm", {
        version: metadata.version,
        installPath: path.join(npmRoot, name)
      })
    );
  } catch {
    return [];
  }
}

