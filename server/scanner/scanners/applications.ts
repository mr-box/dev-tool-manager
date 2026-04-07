import path from "node:path";
import type { Software } from "../../types.ts";
import { buildSoftware, homeDir, readDirSafe } from "../utils.ts";

export async function scanApplications(): Promise<Software[]> {
  const targets = ["/Applications", path.join(homeDir, "Applications")];
  const apps: Software[] = [];
  for (const dir of targets) {
    const entries = await readDirSafe(dir);
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith(".app")) {
        continue;
      }
      const appName = entry.name.replace(/\.app$/i, "");
      apps.push(
        buildSoftware(appName, "dmg", {
          installPath: path.join(dir, entry.name)
        })
      );
    }
  }
  return apps;
}
