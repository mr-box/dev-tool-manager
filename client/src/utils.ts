import { normalizeSoftwareName } from "../../shared/software-merge";

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function normalizeName(value: string): string {
  return normalizeSoftwareName(value);
}

export function hasVisibleName(visibleNames: string[], name: string): boolean {
  const normalized = normalizeName(name);
  return visibleNames.some((item) => normalizeName(item) === normalized);
}

export function addVisibleName(visibleNames: string[], name: string): string[] {
  if (hasVisibleName(visibleNames, name)) {
    return visibleNames;
  }
  return [...visibleNames, name];
}

export function removeVisibleName(visibleNames: string[], name: string): string[] {
  const normalized = normalizeName(name);
  return visibleNames.filter((item) => normalizeName(item) !== normalized);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path.
    }
  }

  if (typeof document !== "undefined") {
    try {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "true");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      return ok;
    } catch {
      return false;
    }
  }

  return false;
}
