import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../server/settings.ts";

test("normalizeSettings should dedupe visibleNames by normalized key", () => {
  const out = normalizeSettings({
    visibleNames: ["Codex", "codex", "co_dex", " OpenCode "]
  });
  assert.deepEqual(out.visibleNames, ["Codex", "OpenCode"]);
});

test("normalizeSettings should drop invalid manual software entries", () => {
  const out = normalizeSettings({
    manualSoftware: [
      {},
      { name: "   " },
      { name: "OpenCode", command: " opencode " }
    ]
  });
  assert.deepEqual(out.manualSoftware, [
    {
      name: "OpenCode",
      displayName: undefined,
      configDir: undefined,
      installPath: undefined,
      command: "opencode"
    }
  ]);
});

test("normalizeSettings should sanitize override fields", () => {
  const out = normalizeSettings({
    softwareOverrides: {
      Codex: {
        displayName: " Codex CLI ",
        configDir: " ~/.codex ",
        installPath: " /opt/homebrew/bin/codex ",
        command: " codex "
      }
    }
  });
  assert.deepEqual(out.softwareOverrides.Codex, {
    displayName: "Codex CLI",
    configDir: "~/.codex",
    installPath: "/opt/homebrew/bin/codex",
    command: "codex"
  });
});
