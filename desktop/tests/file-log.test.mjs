import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileLog } from "../src/file-log.ts";

test("diagnostic logs record errors without exposing configured API keys", async () => {
  const folder = await mkdtemp(join(tmpdir(), "ocr-desktop-log-"));
  try {
    const path = join(folder, "logs", "desktop.log");
    const log = createFileLog(path, () => ["example-secret-key"]);
    await log.write("ERROR", "ocr", "Failed with example-secret-key\nretry");
    const contents = await readFile(path, "utf8");
    assert.match(contents, /ERROR ocr Failed with \[redacted\] retry/);
    assert.doesNotMatch(contents, /example-secret-key/);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
