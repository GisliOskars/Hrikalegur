import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "../scripts/fetch-retry.mjs";

test("endurprófar tímabundið 403-svar", async () => {
  let calls = 0;
  const response = await fetchWithRetry("https://example.test", {}, {
    attempts: 3,
    delays: [0, 0],
    sleep: async () => {},
    fetchImpl: async () => ({ ok: ++calls === 3, status: calls === 3 ? 200 : 403 })
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
});

test("endurprófar ekki varanlegt 404-svar", async () => {
  let calls = 0;
  const response = await fetchWithRetry("https://example.test", {}, {
    attempts: 3,
    sleep: async () => {},
    fetchImpl: async () => { calls += 1; return { ok: false, status: 404 }; }
  });
  assert.equal(response.status, 404);
  assert.equal(calls, 1);
});
