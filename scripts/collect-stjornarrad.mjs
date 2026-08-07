import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWithRetry } from "./fetch-retry.mjs";
import { parseStjornarradFeed, validateStjornarrad } from "./stjornarrad-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/stjornarrad.json");
const reportPath = resolve(root, "data/stjornarrad-report.json");
const feedUrl = process.env.STJORNARRAD_FEED_URL || "https://www.stjornarradid.is/extensions/news/rss/Frettir-fra-ollum-raduneytum.rss";
const now = new Date().toISOString();

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.new`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

try {
  const response = await fetchWithRetry(feedUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Hrikalegur/0.1; +https://hrikalegur.is)",
      "accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "accept-language": "is,en;q=0.7"
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Stjórnarráðið svaraði með stöðukóða ${response.status}.`);
  const parsed = parseStjornarradFeed(await response.text());
  const { accepted, rejected, ignored, duplicates } = validateStjornarrad(parsed);
  const previous = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => null);
  const previousItems = previous?.items || [];
  const previousIds = new Set(previousItems.map((item) => item.id));
  const newItems = accepted.filter((item) => !previousIds.has(item.id));
  const currentIds = new Set(accepted.map((item) => item.id));
  const storedItems = [...accepted, ...previousItems.filter((item) => !currentIds.has(item.id))]
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  const changed = !previous || JSON.stringify(previousItems) !== JSON.stringify(storedItems);
  if (changed) await saveJson(outputPath, { source: "Stjórnarráðið", sourceUrl: feedUrl, fetchedAt: now, items: storedItems });
  await saveJson(reportPath, {
    ok: true, source: "Stjórnarráðið", sourceUrl: feedUrl, checkedAt: now, changed,
    counts: { received: parsed.length, accepted: accepted.length, stored: storedItems.length, new: newItems.length, ignored: ignored.length, duplicates: duplicates.length, rejected: rejected.length },
    newItems: newItems.map(({ id, title, url }) => ({ id, title, url })), ignored, duplicates, rejected
  });
  console.log(`Stjórnarráðið: ${accepted.length} viðeigandi fréttir, ${newItems.length} nýjar, ${ignored.length} utan vöktunar.`);
} catch (error) {
  const previousExists = await readFile(outputPath, "utf8").then(() => true).catch(() => false);
  await saveJson(reportPath, { ok: false, source: "Stjórnarráðið", sourceUrl: feedUrl, checkedAt: now, preservedPreviousData: previousExists, error: error.message });
  const message = `Vöktun Stjórnarráðsins mistókst: ${error.message}. ${previousExists ? "Síðustu gildu gögn voru varðveitt." : "Engin eldri gögn fundust."}`;
  if (process.env.STJORNARRAD_SOFT_FAIL === "1" && previousExists) console.warn(message);
  else { console.error(message); process.exitCode = 1; }
}
