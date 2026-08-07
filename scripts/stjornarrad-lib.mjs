import { extractKeywords, plainText, summarize } from "./uua-lib.mjs";

function field(xml, tag) {
  const safe = tag.replace(":", "\\:");
  return xml.match(new RegExp(`<${safe}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safe}>`, "i"))?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() || "";
}

export function parseStjornarradFeed(xml) {
  if (!/<rss\b/i.test(xml) || !/<channel>/i.test(xml)) throw new Error("Svarið er ekki gildur RSS-straumur.");
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const title = plainText(field(item, "title"));
    const url = plainText(field(item, "link"));
    const description = field(item, "description");
    const content = field(item, "lisalive:content") || description;
    const published = plainText(field(item, "pubDate"));
    const date = new Date(published);
    const tags = extractKeywords(`${title} ${description} ${content}`);
    return {
      id: url,
      category: "frett",
      type: "Frétt",
      source: "Stjórnarráðið",
      publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(),
      title,
      summary: summarize(description) || title,
      tags,
      url,
      relevant: Boolean(tags)
    };
  });
}

export function validateStjornarrad(items) {
  const accepted = [], rejected = [], ignored = [], duplicates = [], seen = new Set();
  for (const item of items) {
    if (!item.relevant) {
      ignored.push({ title: item.title, url: item.url, reason: "utan vaktaðra efnisorða" });
      continue;
    }
    const reasons = [];
    if (!item.title) reasons.push("titill vantar");
    if (!item.publishedAt) reasons.push("dagsetning vantar eða er ógild");
    let parsed;
    try { parsed = new URL(item.url); } catch { reasons.push("vefslóð er ógild"); }
    if (parsed && (parsed.protocol !== "https:" || parsed.hostname !== "www.stjornarradid.is" || !parsed.pathname.startsWith("/efst-a-baugi/frettir/stok-frett/"))) {
      reasons.push("vefslóð vísar ekki beint í frétt Stjórnarráðsins");
    }
    if (reasons.length) {
      rejected.push({ title: item.title, url: item.url, reasons });
      continue;
    }
    const key = parsed.href.replace(/\/$/, "");
    if (seen.has(key)) {
      duplicates.push({ title: item.title, url: item.url });
      continue;
    }
    seen.add(key);
    accepted.push(item);
  }
  accepted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { accepted, rejected, ignored, duplicates };
}
