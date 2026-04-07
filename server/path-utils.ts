import path from "node:path";
import os from "node:os";

export function expandHome(inputPath: string): string {
  return inputPath.startsWith("~/")
    ? path.join(os.homedir(), inputPath.slice(2))
    : inputPath;
}
