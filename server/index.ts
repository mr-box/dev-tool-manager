import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { loadLocalEnv } from "./env.ts";
import { applySoftwareSettings, normalizeSoftwareName } from "../shared/software-merge.ts";
import { expandHome } from "./path-utils.ts";
import {
  aggregateScanResults,
  aggregateScanResultsWithHints,
  clearScannerCaches,
  detectResidues,
  getLatestScanResult,
  listConfigDirectory,
  openConfigEntryInFinder,
  openConfigEntryInTerminal,
  openResidueDirectory
} from "./scanner/index.ts";
import {
  readSettings,
  writeSettings,
  type UserSettings
} from "./settings.ts";
import type { ApiError, ApiOk, ResidueResult, ScanResult } from "./types.ts";

loadLocalEnv();

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3456);
const CLIENT_PORT = Number(process.env.CLIENT_PORT ?? 5173);
const HOST = process.env.SERVER_HOST?.trim() || "127.0.0.1";

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [`http://localhost:${CLIENT_PORT}`, `http://127.0.0.1:${CLIENT_PORT}`];
}

let scanning = false;
let progress = 0;
let effectiveScanResult: ScanResult = {
  items: [],
  scannedAt: new Date(0).toISOString(),
  duration: 0
};

function ok<T>(data: T): ApiOk<T> {
  return { data };
}

function asError(error: string, message: string): ApiError {
  return { error, message };
}

function findEffectiveSoftwareByName(name: string) {
  return effectiveScanResult.items.find(
    (item) => normalizeSoftwareName(item.name) === normalizeSoftwareName(name)
  );
}

function buildCustomResidueMappings(settings: UserSettings): Array<{
  softwareName: string;
  configDir: string;
  aliases?: string[];
}> {
  const mappings: Array<{ softwareName: string; configDir: string; aliases?: string[] }> = [];

  for (const item of settings.manualSoftware) {
    if (!item.configDir) {
      continue;
    }
    mappings.push({
      softwareName: item.name,
      configDir: item.configDir,
      aliases: [item.displayName ?? item.name]
    });
  }

  for (const [name, override] of Object.entries(settings.softwareOverrides)) {
    if (!override.configDir) {
      continue;
    }
    mappings.push({
      softwareName: name,
      configDir: override.configDir,
      aliases: [override.displayName ?? name]
    });
  }

  return mappings;
}

function filterIgnoredResidues(
  residues: ResidueResult,
  ignoredPaths: string[]
): ResidueResult {
  if (!ignoredPaths.length) {
    return residues;
  }
  const ignored = new Set(
    ignoredPaths.map((item) => path.resolve(expandHome(item.trim()))).filter(Boolean)
  );
  const items = residues.items.filter((item) => !ignored.has(path.resolve(item.path)));
  return {
    items,
    totalSize: items.reduce((sum, item) => sum + item.size, 0)
  };
}

async function refreshEffectiveScanResult(raw: ScanResult): Promise<ScanResult> {
  const settings = await readSettings();
  effectiveScanResult = {
    ...raw,
    items: applySoftwareSettings(raw.items, settings.manualSoftware, settings.softwareOverrides)
  };
  return effectiveScanResult;
}

async function runScan(): Promise<ScanResult> {
  scanning = true;
  progress = 5;
  try {
    clearScannerCaches();
    const settings = await readSettings();
    const manualHints = settings.manualSoftware
      .filter((item) => typeof item.command === "string" && item.command.trim().length > 0)
      .map((item) => ({ name: item.name, command: item.command as string }));
    const overrideHints = Object.entries(settings.softwareOverrides)
      .filter(([, value]) => typeof value.command === "string" && value.command.trim().length > 0)
      .map(([name, value]) => ({ name, command: value.command as string }));
    const pathScanHints = [...manualHints, ...overrideHints];
    const raw =
      pathScanHints.length > 0
        ? await aggregateScanResultsWithHints(pathScanHints)
        : await aggregateScanResults();
    const result = await refreshEffectiveScanResult(raw);
    progress = 100;
    return result;
  } finally {
    scanning = false;
    setTimeout(() => {
      progress = 0;
    }, 1000);
  }
}

async function main(): Promise<void> {
  const allowedOrigins = new Set(parseCorsOrigins());
  await fastify.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    }
  });

  fastify.post("/api/scan", async (_, reply) => {
    if (scanning) {
      return reply.status(409).send(asError("scan_in_progress", "Scan already running"));
    }
    try {
      await runScan();
      return ok({ status: "ok" as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scan";
      return reply.status(500).send(asError("internal_error", message));
    }
  });

  fastify.get("/api/scan/status", async () => ok({ scanning, progress }));

  fastify.get("/api/settings", async () => {
    const settings = await readSettings();
    return ok(settings);
  });

  fastify.put<{ Body: Partial<UserSettings> }>("/api/settings", async (request) => {
    const current = await readSettings();
    const next = {
      ...current,
      ...request.body
    } satisfies UserSettings;
    const saved = await writeSettings(next);
    await refreshEffectiveScanResult(getLatestScanResult());
    return ok(saved);
  });

  fastify.get("/api/software", async (_, reply) => {
    const current = getLatestScanResult();
    if (!current.items.length && !scanning) {
      try {
        await runScan();
        return ok(getLatestScanResult());
      } catch {
        return reply
          .status(500)
          .send(asError("internal_error", "Failed to perform initial scan"));
      }
    }
    return ok(current);
  });

  fastify.get<{ Params: { name: string } }>("/api/software/:name", async (request, reply) => {
    const software = effectiveScanResult.items.find(
      (item) =>
        normalizeSoftwareName(item.name) === normalizeSoftwareName(request.params.name)
    );
    if (!software) {
      return reply.status(404).send(asError("not_found", "Software not found"));
    }
    return ok({ software });
  });

  fastify.get<{ Params: { name: string }; Querystring: { path?: string } }>(
    "/api/software/:name/config",
    async (request, reply) => {
      const effective = findEffectiveSoftwareByName(request.params.name);
      if (!effective) {
        return reply.status(404).send(asError("not_found", "Software not found"));
      }
      if (!effective.configDir) {
        return ok({ root: null, path: null, items: [] as [] });
      }
      try {
        const data = await listConfigDirectory(effective, request.query.path);
        return ok(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid config path";
        return reply.status(400).send(asError("invalid_request", message));
      }
    }
  );

  fastify.post<{ Params: { name: string }; Body: { path?: string } }>(
    "/api/software/:name/config/open",
    async (request, reply) => {
      const effective = findEffectiveSoftwareByName(request.params.name);
      if (!effective) {
        return reply.status(404).send(asError("not_found", "Software not found"));
      }
      const targetPath = request.body?.path;
      if (!targetPath) {
        return reply
          .status(400)
          .send(asError("invalid_request", "Request body requires string path"));
      }
      try {
        await openConfigEntryInFinder(effective, targetPath);
        return ok({ status: "ok" as const });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open folder";
        return reply.status(400).send(asError("invalid_request", message));
      }
    }
  );

  fastify.post<{ Params: { name: string }; Body: { path?: string } }>(
    "/api/software/:name/config/open-terminal",
    async (request, reply) => {
      const effective = findEffectiveSoftwareByName(request.params.name);
      if (!effective) {
        return reply.status(404).send(asError("not_found", "Software not found"));
      }
      const targetPath = request.body?.path;
      if (!targetPath) {
        return reply
          .status(400)
          .send(asError("invalid_request", "Request body requires string path"));
      }
      try {
        await openConfigEntryInTerminal(effective, targetPath);
        return ok({ status: "ok" as const });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open in terminal";
        return reply.status(400).send(asError("invalid_request", message));
      }
    }
  );

  fastify.get("/api/residues", async () => {
    const current = effectiveScanResult;
    const settings = await readSettings();
    const customMappings = buildCustomResidueMappings(settings);
    const residues: ResidueResult = await detectResidues(current.items, customMappings);
    return ok(filterIgnoredResidues(residues, settings.ignoredResiduePaths ?? []));
  });

  fastify.post<{ Body: { path?: string } }>("/api/residues/open", async (request, reply) => {
    const residuePath = request.body?.path;
    if (!residuePath) {
      return reply
        .status(400)
        .send(asError("invalid_request", "Request body requires string path"));
    }
    try {
      await openResidueDirectory(residuePath);
      return ok({ status: "ok" as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open directory";
      return reply.status(400).send(asError("invalid_request", message));
    }
  });

  fastify.setErrorHandler((error, _, reply) => {
    const errorCode = typeof error === "object" && error && "code" in error ? error.code : undefined;
    if (errorCode === "FST_ERR_CTP_EMPTY_JSON_BODY") {
      reply
        .status(400)
        .send(asError("invalid_request", "Empty JSON body is not allowed for this request"));
      return;
    }
    requestLog(error);
    reply.status(500).send(asError("internal_error", "Internal server error"));
  });

  await fastify.listen({ port: PORT, host: HOST });
}

function requestLog(error: unknown): void {
  fastify.log.error(error);
}

void main();
