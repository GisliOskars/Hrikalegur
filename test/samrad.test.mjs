import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseSamradDetail, parseSamradFeed, validateSamrad } from "../scripts/samrad-lib.mjs";

const fixture = await readFile(new URL("./fixtures/samrad-feed.xml", import.meta.url), "utf8");
const detailFixture = await readFile(new URL("./fixtures/samrad-detail.html", import.meta.url), "utf8");

test("les Samráðsgáttarmál, frest og efnisorð", () => {
  const [item] = parseSamradFeed(fixture);
  assert.equal(item.caseNumber, "S-42/2026");
  assert.equal(item.deadline, "30.7.2026");
  assert.match(item.tags, /framkvæmdaleyfi/);
  assert.match(item.tags, /virkjunarkostur/);
  assert.equal(item.url, "https://island.is/samradsgatt/mal/4242");
});

test("síar frá óviðkomandi mál og hafnar óbeinum tenglum", () => {
  const result = validateSamrad(parseSamradFeed(fixture));
  assert.equal(result.accepted.length, 1);
  assert.equal(result.ignored.length, 1);
  assert.equal(result.rejected.length, 1);
});

test("tekur gilt mál án dagsetningar úr opinbera RSS-straumnum", () => {
  const xml = `<rss><channel><item><title>Drög um náttúruvernd</title><description>Drög um náttúruvernd</description><link>https://island.is/samradsgatt/mal/9999</link></item></channel></rss>`;
  const result = validateSamrad(parseSamradFeed(xml));
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].publishedAt, "");
});

test("auðgar mál með dagsetningu, fresti og lýsingu", () => {
  const detail = parseSamradDetail(detailFixture, 4242);
  assert.equal(detail.caseNumber, "S-42/2026");
  assert.equal(detail.publishedAt, "2026-07-20T00:00:00.000Z");
  assert.equal(detail.deadline, "2026-08-03T23:59:59.000Z");
  assert.match(detail.summary, /framkvæmdaleyfum/);
  assert.match(detail.tags, /virkjunarkostur/);
});
