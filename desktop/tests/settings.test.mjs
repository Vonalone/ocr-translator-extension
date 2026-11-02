import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings } from "../src/settings.ts";

test("settings validation keeps the capture region and overlay usable", () => {
  const settings = normalizeSettings({
    provider: "untrusted", fontSize: 1000, opacity: -1, bottom: 80,
    cropTop: -20, cropHeight: 500, cropWidth: 0, horizontal: 200,
  });
  assert.equal(settings.provider, "google");
  assert.equal(settings.fontSize, 96);
  assert.equal(settings.opacity, 0.1);
  assert.equal(settings.bottom, 45);
  assert.equal(settings.cropTop, 0);
  assert.equal(settings.cropHeight, 100);
  assert.equal(settings.cropWidth, 20);
  assert.equal(settings.horizontal, 95);
});

test("settings preserve configured translation endpoints and capture source", () => {
  const settings = normalizeSettings({
    provider: "openai", sourceId: "window:123:0", llmBaseUrl: "http://localhost:1234/v1",
    llmModel: "local-model", fontSize: 42, opacity: 0.75,
  });
  assert.equal(settings.provider, "openai");
  assert.equal(settings.sourceId, "window:123:0");
  assert.equal(settings.llmBaseUrl, "http://localhost:1234/v1");
  assert.equal(settings.fontSize, 42);
  assert.equal(settings.opacity, 0.75);
});
