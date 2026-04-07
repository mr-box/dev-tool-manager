import type {
  ApiOk,
  ApiError,
  Residue,
  ScanResult,
  Software,
  ConfigFile,
  UserSettings
} from "../../shared/api-contract.ts";

export interface SoftwareDetailDto {
  software: Software;
}

export type ConfigNodeDto = ConfigFile;

const defaultHeaders = { "Content-Type": "application/json" };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";
  let payload: ApiOk<T> | ApiError | null = null;
  if (contentType.includes("application/json")) {
    payload = (await response.json()) as ApiOk<T> | ApiError;
  }

  if (!response.ok) {
    if (payload && "message" in payload) {
      throw new Error(payload.message ?? "Request failed");
    }
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Invalid JSON response");
  }
  return payload.data;
}

/** Trigger one full environment scan. */
export async function triggerScan(): Promise<{ status: "ok" }> {
  return request("/api/scan", {
    method: "POST"
  });
}

/** Fetch current scan status. */
export async function getScanStatus(): Promise<{ scanning: boolean; progress?: number }> {
  return request("/api/scan/status");
}

/** Fetch full software list. */
export async function getSoftwareList(): Promise<ScanResult> {
  return request("/api/software");
}

/** Fetch one software detail by name. */
export async function getSoftwareDetail(name: string): Promise<SoftwareDetailDto> {
  return request(`/api/software/${encodeURIComponent(name)}`);
}

/** Fetch one config directory level for the software. */
export async function getSoftwareConfigChildren(
  name: string,
  configPath?: string
): Promise<{ root: string | null; path: string | null; items: ConfigNodeDto[] }> {
  const query = configPath ? `?path=${encodeURIComponent(configPath)}` : "";
  return request(`/api/software/${encodeURIComponent(name)}/config${query}`);
}

/** Open one config file's containing folder in Finder. */
export async function openSoftwareConfigEntry(
  name: string,
  filePath: string
): Promise<{ status: "ok" }> {
  return request(`/api/software/${encodeURIComponent(name)}/config/open`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ path: filePath })
  });
}

/** Open config entry's containing directory in Terminal. */
export async function openSoftwareConfigInTerminal(
  name: string,
  filePath: string
): Promise<{ status: "ok" }> {
  return request(`/api/software/${encodeURIComponent(name)}/config/open-terminal`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ path: filePath })
  });
}

/** Fetch residue list. */
export async function getResidues(): Promise<{ items: Residue[]; totalSize: number }> {
  return request("/api/residues");
}

/** Open one residue directory in Finder. */
export async function openResidue(path: string): Promise<{ status: "ok" }> {
  return request("/api/residues/open", {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ path })
  });
}

/** Fetch persisted user settings from server-side config file. */
export async function getSettings(): Promise<UserSettings> {
  return request("/api/settings");
}

/** Persist user settings to server-side config file. */
export async function saveSettings(
  payload: Partial<UserSettings>
): Promise<UserSettings> {
  return request("/api/settings", {
    method: "PUT",
    headers: defaultHeaders,
    body: JSON.stringify(payload)
  });
}
