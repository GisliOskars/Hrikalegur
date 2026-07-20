import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseUuaFeed, plainText, validateAndDedupe } from "../scripts/uua-lib.mjs";

const fixture = await readFile(new URL("./fixtures/uua-feed.xml", import.meta.url), "utf8");

test("les UUA-málsnúmer, dagsetningu og beinan málstengil", () => {
  const [item] = parseUuaFeed(fixture);
  assert.equal(item.caseNumber, "UUA2603014");
  assert.equal(item.publishedAt, "2026-07-10T18:00:57.000Z");
  assert.equal(item.url, "https://uua.is/urleits/uua2603014-lyngas/");
  assert.match(item.summary, /kæra á ákvörðun/);
  assert.match(item.tags, /byggingarleyfi/);
  assert.match(item.tags, /grenndarkynning/);
  assert.match(item.tags, /framkvæmdaleyfi/);
  assert.match(item.tags, /virkjunarkostur/);
});

test("fjarlægir HTML en varðveitir íslenskan texta", () => assert.equal(plainText("<p>Úrskurður &amp; niðurstaða</p>"), "Úrskurður & niðurstaða"));

test("hafnar röngum færslum og birtir málsnúmer aðeins einu sinni", () => {
  const result = validateAndDedupe(parseUuaFeed(fixture));
  assert.equal(result.accepted.length, 1); assert.equal(result.duplicates.length, 1); assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reasons.join(" "), /málsnúmer/); assert.match(result.rejected[0].reasons.join(" "), /beint/);
});

test("stoppar á efni sem er ekki RSS", () => assert.throws(() => parseUuaFeed("<html>villa</html>"), /RSS/));
