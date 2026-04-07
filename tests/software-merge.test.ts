import assert from "node:assert/strict";
import test from "node:test";
import { applySoftwareSettings } from "../shared/software-merge.ts";
import type { Software } from "../server/types.ts";

// Helper to create Software
function software(name: string, overrides: Partial<Software> = {}): Software {
  return {
    name,
    displayName: name,
    installMethod: "unknown" as const,
    ...overrides
  };
}

test("applySoftwareSettings: manual software overrides existing", () => {
  const scanned: Software[] = [software("codex")];
  const manual = [{ name: "Codex", displayName: "Codex CLI", configDir: "~/.codex" }];
  const result = applySoftwareSettings(scanned, manual, {});

  assert.strictEqual(result.length, 1);
  assert.equal(result[0].displayName, "Codex CLI");
  assert.equal(result[0].configDir, "~/.codex");
});

test("applySoftwareSettings: overrides update without manual", () => {
  const scanned: Software[] = [software("trae", { configDir: "~/.old" })];
  const overrides = {
    trae: { displayName: "Trae CN", configDir: "~/.trae-cn" } as const
  };
  const result = applySoftwareSettings(scanned, [], overrides);

  assert.equal(result[0].displayName, "Trae CN");
  assert.equal(result[0].configDir, "~/.trae-cn");
});

test("applySoftwareSettings: deduplication by normalized name", () => {
  const scanned: Software[] = [software("OpenCode")];
  const manual = [{ name: "opencode", displayName: "OpenCode Plus" }];
  const result = applySoftwareSettings(scanned, manual, {});

  assert.strictEqual(result.length, 1);
  assert.equal(result[0].displayName, "OpenCode Plus");
});

test("applySoftwareSettings: returns sorted by displayName", () => {
  const scanned: Software[] = [
    software("Zed"),
    software("Vim"),
    software("Emacs")
  ];
  const result = applySoftwareSettings(scanned, [], {});

  assert.strictEqual(result.length, 3);
  assert.equal(result[0].name, "Emacs");
  assert.equal(result[1].name, "Vim");
  assert.equal(result[2].name, "Zed");
});
