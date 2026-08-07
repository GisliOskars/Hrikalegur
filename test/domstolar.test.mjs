import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseDomstolarDetail, parseDomstolarFeed, validateDomstolar } from "../scripts/domstolar-lib.mjs";

const feed = await readFile(new URL("./fixtures/domstolar-feed.xml", import.meta.url), "utf8");
const detail = await readFile(new URL("./fixtures/domstolar-detail.html", import.meta.url), "utf8");

test("les opinbert dóma-RSS og beinan dómatengil", () => {
  const [item] = parseDomstolarFeed(feed, "Landsréttur");
  assert.equal(item.caseNumber, "42/2026");
  assert.equal(item.publishedAt, "2026-08-07T00:00:00.000Z");
  assert.equal(item.url, "https://island.is/domar/g-12345678-1234-1234-1234-123456789abc");
});

test("les opinbera reifun og efnisorð af dómasíðu", () => {
  const result = parseDomstolarDetail(detail);
  assert.equal(result.court, "Landsréttur");
  assert.match(result.tags, /framkvæmdaleyfi/);
  assert.match(result.tags, /virkjunarkostur/);
  assert.match(result.summary, /framkvæmdaleyfi/);
});

test("samþykkir viðeigandi dóm og hafnar óbeinum tengli", () => {
  const base = parseDomstolarFeed(feed, "Landsréttur")[0];
  const enriched = { ...base, ...parseDomstolarDetail(detail) };
  assert.equal(validateDomstolar([enriched]).accepted.length, 1);
  assert.equal(validateDomstolar([{ ...enriched, url: "https://island.is/domar/s-12345678-1234-1234-1234-123456789abc" }]).accepted.length, 1);
  assert.equal(validateDomstolar([{ ...enriched, url: "https://island.is/s/domstolar/domar" }]).rejected.length, 1);
});
