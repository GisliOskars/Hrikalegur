import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSamradDetail, parseSamradFeed, validateSamrad } from "./samrad-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/samrad.json");
const reportPath = resolve(root, "data/samrad-report.json");
const feedUrl = process.env.SAMRAD_FEED_URL || "https://island.is/samradsgatt/api/rss";
const now = new Date().toISOString();

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.new`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

try {
  const response = await fetch(feedUrl, { headers: { "user-agent": "Hrikalegur/0.1 (+https://hrikalegur.is)" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Samráðsgátt svaraði með stöðukóða ${response.status}.`);
  const parsed = parseSamradFeed(await response.text());
  const initial = validateSamrad(parsed);
  const enrichmentErrors = [];
  const accepted = [];
  for (let offset = 0; offset < initial.accepted.length; offset += 6) {
    const batch = initial.accepted.slice(offset, offset + 6);
    const enriched = await Promise.all(batch.map(async (item) => {
      try {
        const detailResponse = await fetch(item.url, { headers: { "user-agent": "Hrikalegur/0.1 (+https://hrikalegur.is)" }, signal: AbortSignal.timeout(20000) });
        if (!detailResponse.ok) throw new Error(`stöðukóði ${detailResponse.status}`);
        const detail = parseSamradDetail(await detailResponse.text(), item.url.match(/\/mal\/(\d+)/)?.[1]);
        return { ...item, ...detail, tags: `${item.tags} ${detail.tags}`.trim(), summary: detail.summary || item.summary };
      } catch (error) {
        enrichmentErrors.push({ title: item.title, url: item.url, error: error.message });
        return item;
      }
    }));
    accepted.push(...enriched);
  }
  accepted.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const { rejected, ignored, duplicates } = initial;
  const previous = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => null);
  const previousItems = previous?.items || [];
  const previousIds = new Set(previousItems.map((item) => item.id));
  const newItems = accepted.filter((item) => !previousIds.has(item.id));
  const changed = !previous || JSON.stringify(previousItems) !== JSON.stringify(accepted);
  if (changed) await saveJson(outputPath, { source: "Samráðsgátt", sourceUrl: feedUrl, fetchedAt: now, items: accepted });
  await saveJson(reportPath, {
    ok: true, source: "Samráðsgátt", sourceUrl: feedUrl, checkedAt: now, changed,
    counts: { received: parsed.length, accepted: accepted.length, new: newItems.length, ignored: ignored.length, duplicates: duplicates.length, rejected: rejected.length, enrichmentErrors: enrichmentErrors.length },
    newItems: newItems.map(({ id, title, url }) => ({ id, title, url })), enrichmentErrors, ignored, duplicates, rejected
  });
  console.log(`Samráðsgátt: ${accepted.length} viðeigandi mál, ${newItems.length} ný, ${ignored.length} utan vöktunar.`);
} catch (error) {
  await saveJson(reportPath, { ok: false, source: "Samráðsgátt", sourceUrl: feedUrl, checkedAt: now, error: error.message });
  console.error(`Vöktun Samráðsgáttar mistókst: ${error.message}`);
  process.exitCode = 1;
}
