import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSoftwareName } from "../shared/software-merge.ts";
import { stripScopePackage } from "../server/scanner/common.ts";

test("normalizeSoftwareName should lowercase and replace separators", () => {
  assert.equal(normalizeSoftwareName("Claude Code"), "claudecode");
  assert.equal(normalizeSoftwareName("Open-Code_Tool"), "opencodetool");
  // Note: slashes are preserved
  assert.equal(normalizeSoftwareName("@openai/codex"), "@openai/codex");
});

test("stripScopePackage should remove npm scope", () => {
  assert.equal(stripScopePackage("@openai/codex"), "codex");
  assert.equal(stripScopePackage("simple"), "simple");
});
