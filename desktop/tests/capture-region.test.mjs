import test from "node:test";
import assert from "node:assert/strict";
import { captureRegion } from "../src/capture-region.ts";

test("only the configured subtitle strip is transferred for OCR", () => {
  assert.deepEqual(
    captureRegion(1920, 1080, { cropTop: 70, cropHeight: 25, cropWidth: 80 }),
    { x: 192, y: 756, width: 1536, height: 270 },
  );
});

test("a bottom crop stays inside the captured window", () => {
  assert.deepEqual(
    captureRegion(1280, 720, { cropTop: 90, cropHeight: 100, cropWidth: 50 }),
    { x: 320, y: 648, width: 640, height: 72 },
  );
});
