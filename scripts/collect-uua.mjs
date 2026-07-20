import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUuaFeed, validateAndDedupe } from "./uua-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/uua.json");
const reportPath = resolve(root, "data/uua-report.json");
const feedUrl = process.env.UUA_FEED_URL || "https://uua.is/feed/";
const now = new Date().toISOString();

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.new`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

try {
  const response = await fetch(feedUrl, { headers: { "user-agent": "Hrikalegur/0.1 (+https://hrikalegur.is)" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`UUA svaraði með stöðukóða ${response.status}.`);
  const parsed = parseUuaFeed(await response.text());
  const { accepted, rejected, duplicates } = validateAndDedupe(parsed);
  if (!accepted.length) throw new Error("Engin gild mál fundust; eldri gögn voru látin ósnert.");
  const previous = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => ({ items: [] }));
  const previousIds = new Set(previous.items.map((item) => item.id));
  const newItems = accepted.filter((item) => !previousIds.has(item.id));
  await saveJson(outputPath, { source: "UUA", sourceUrl: feedUrl, fetchedAt: now, items: accepted });
  await saveJson(reportPath, {
    ok: true, source: "UUA", sourceUrl: feedUrl, checkedAt: now,
    counts: { received: parsed.length, accepted: accepted.length, new: newItems.length, duplicates: duplicates.length, rejected: rejected.length },
    newItems: newItems.map(({ id, title, url }) => ({ id, title, url })), duplicates, rejected
  });
  console.log(`UUA: ${accepted.length} gild mál, ${newItems.length} ný, ${rejected.length} hafnað.`);
} catch (error) {
  await saveJson(reportPath, { ok: false, source: "UUA", sourceUrl: feedUrl, checkedAt: now, error: error.message });
  console.error(`UUA-vöktun mistókst: ${error.message}`);
  process.exitCode = 1;
}
