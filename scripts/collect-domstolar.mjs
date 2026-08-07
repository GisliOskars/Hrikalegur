import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWithRetry } from "./fetch-retry.mjs";
import { parseDomstolarDetail, parseDomstolarFeed, validateDomstolar } from "./domstolar-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/domstolar.json");
const reportPath = resolve(root, "data/domstolar-report.json");
const now = new Date().toISOString();
const feeds = [
  ["Hæstiréttur", "H%C3%A6stir%C3%A9ttur"],
  ["Landsréttur", "landsrettur"],
  ["Héraðsdómur Reykjavíkur", "hd-reykjavik"],
  ["Héraðsdómur Vesturlands", "hd-vesturland"],
  ["Héraðsdómur Vestfjarða", "hd-vestfirdir"],
  ["Héraðsdómur Norðurlands vestra", "hd-nordurland-vestra"],
  ["Héraðsdómur Norðurlands eystra", "hd-nordurland-eystra"],
  ["Héraðsdómur Austurlands", "hd-austurland"],
  ["Héraðsdómur Suðurlands", "hd-sudurland"],
  ["Héraðsdómur Reykjaness", "hd-reykjanes"]
].map(([court, value]) => ({ court, url: `https://island.is/rss/domar?court=${value}` }));

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.new`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const requestOptions = {
  headers: {
    "user-agent": "Mozilla/5.0 (compatible; Hrikalegur/0.1; +https://hrikalegur.is)",
    "accept": "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.8",
    "accept-language": "is,en;q=0.7"
  },
  signal: AbortSignal.timeout(30000)
};

try {
  const feedErrors = [];
  const feedResults = await Promise.all(feeds.map(async ({ court, url }) => {
    try {
      const response = await fetchWithRetry(url, requestOptions);
      if (!response.ok) throw new Error(`stöðukóði ${response.status}`);
      return parseDomstolarFeed(await response.text(), court);
    } catch (error) {
      feedErrors.push({ court, url, error: error.message });
      return [];
    }
  }));
  const parsed = feedResults.flat();
  if (!parsed.length) throw new Error("Enginn dómstóll skilaði gildum RSS-gögnum.");

  const detailErrors = [];
  const enriched = [];
  for (let offset = 0; offset < parsed.length; offset += 6) {
    const batch = parsed.slice(offset, offset + 6);
    enriched.push(...await Promise.all(batch.map(async (item) => {
      try {
        const response = await fetchWithRetry(item.url, { ...requestOptions, signal: AbortSignal.timeout(30000) }, { attempts: 2, delays: [1200] });
        if (!response.ok) throw new Error(`stöðukóði ${response.status}`);
        const detail = parseDomstolarDetail(await response.text());
        const source = detail.court || item.source;
        return {
          ...item,
          ...detail,
          source,
          title: `${detail.caseNumber || item.caseNumber} · ${source}`,
          summary: detail.summary || item.summary,
          tags: `${detail.tags} ${detail.courtKeywords}`.trim()
        };
      } catch (error) {
        detailErrors.push({ title: item.title, url: item.url, error: error.message });
        return item;
      }
    })));
  }

  const { accepted, rejected, ignored, duplicates } = validateDomstolar(enriched);
  const previous = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => null);
  const previousItems = previous?.items || [];
  const previousIds = new Set(previousItems.map((item) => item.id));
  const newItems = accepted.filter((item) => !previousIds.has(item.id));
  const currentIds = new Set(accepted.map((item) => item.id));
  const storedItems = [...accepted, ...previousItems.filter((item) => !currentIds.has(item.id))]
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const changed = !previous || JSON.stringify(previousItems) !== JSON.stringify(storedItems);
  if (changed) await saveJson(outputPath, { source: "Dómstólar", sourceUrl: "https://island.is/s/domstolar/domar", fetchedAt: now, items: storedItems });
  await saveJson(reportPath, {
    ok: true, source: "Dómstólar", sourceUrl: "https://island.is/s/domstolar/domar", checkedAt: now, changed,
    counts: { received: parsed.length, accepted: accepted.length, stored: storedItems.length, new: newItems.length, ignored: ignored.length, duplicates: duplicates.length, rejected: rejected.length, feedErrors: feedErrors.length, detailErrors: detailErrors.length },
    newItems: newItems.map(({ id, title, url }) => ({ id, title, url })), feedErrors, detailErrors, ignored, duplicates, rejected
  });
  console.log(`Dómstólar: ${accepted.length} viðeigandi dómar, ${newItems.length} nýir, ${ignored.length} utan vöktunar.`);
} catch (error) {
  const previousExists = await readFile(outputPath, "utf8").then(() => true).catch(() => false);
  await saveJson(reportPath, { ok: false, source: "Dómstólar", checkedAt: now, preservedPreviousData: previousExists, error: error.message });
  const message = `Vöktun dómstóla mistókst: ${error.message}. ${previousExists ? "Síðustu gildu gögn voru varðveitt." : "Engin eldri gögn fundust."}`;
  if (process.env.DOMSTOLAR_SOFT_FAIL === "1" && previousExists) console.warn(message);
  else { console.error(message); process.exitCode = 1; }
}
