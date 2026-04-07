import assert from "node:assert/strict";
import test from "node:test";
import { expandHome } from "../server/path-utils.ts";
import os from "node:os";

test("expandHome should replace ~ with home directory", () => {
  const home = os.homedir();
  const result = expandHome("~/.config/dev-tool-manager");
  assert.strictEqual(result, home + "/.config/dev-tool-manager");
});

test("expandHome should leave absolute paths unchanged", () => {
  const path = "/absolute/path/to/config";
  assert.strictEqual(expandHome(path), path);
});

test("expandHome should handle paths with spaces and special chars", () => {
  const path = "~/My Configs/.tool";
  const result = expandHome(path);
  assert.ok(result.startsWith(os.homedir()));
  assert.ok(result.endsWith("My Configs/.tool"));
});
