import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseStjornarradFeed, validateStjornarrad } from "../scripts/stjornarrad-lib.mjs";

const fixture = await readFile(new URL("./fixtures/stjornarrad-feed.xml", import.meta.url), "utf8");

test("les frétt Stjórnarráðsins og finnur efnisorð í fullum texta", () => {
  const [item] = parseStjornarradFeed(fixture);
  assert.equal(item.publishedAt, "2026-08-07T10:00:00.000Z");
  assert.match(item.tags, /framkvæmdaleyfi/);
  assert.match(item.tags, /virkjunarkostur/);
  assert.match(item.tags, /mat á umhverfisáhrifum/);
});

test("síar frá óviðkomandi frétt og hafnar óbeinum tengli", () => {
  const result = validateStjornarrad(parseStjornarradFeed(fixture));
  assert.equal(result.accepted.length, 1);
  assert.equal(result.ignored.length, 1);
  assert.equal(result.rejected.length, 1);
});
