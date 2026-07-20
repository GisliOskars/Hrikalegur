const entities = new Map([
  ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", "\""], ["apos", "'"],
  ["nbsp", " "], ["hellip", "…"], ["ndash", "–"], ["mdash", "—"]
]);

function decodeEntities(value = "") {
  return value.replace(/&#(x?[0-9a-f]+);|&([a-z]+);/gi, (match, numeric, named) => {
    if (numeric) {
      const base = numeric[0].toLowerCase() === "x" ? 16 : 10;
      const code = Number.parseInt(numeric.replace(/^x/i, ""), base);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities.get(named.toLowerCase()) ?? match;
  });
}

function field(xml, tag) {
  const safeTag = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${safeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safeTag}>`, "i"));
  if (!match) return "";
  return decodeEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
}

export function plainText(html = "") {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/The post[\s\S]*?appeared first on[\s\S]*?\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarize(html, maxLength = 230) {
  const value = plainText(html);
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > 100 ? boundary : maxLength).trim()}…`;
}

export function parseUuaFeed(xml) {
  if (!/<rss\b/i.test(xml) || !/<channel>/i.test(xml)) throw new Error("Svarið er ekki gildur RSS-straumur.");
  const rawItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return rawItems.map((item) => {
    const title = plainText(field(item, "title"));
    const url = field(item, "link").trim();
    const published = field(item, "pubDate");
    const description = field(item, "description");
    const caseNumber = title.match(/\b(?:UUA\d{7}|\d{1,3}\/\d{4})\b/i)?.[0]?.toUpperCase() ?? "";
    const date = new Date(published);
    return {
      id: url, caseNumber, category: "urskurdur",
      type: /bráðabirgða/i.test(description) ? "Bráðabirgðaúrskurður" : "Úrskurður",
      source: "UUA", publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(),
      title, summary: summarize(description), tags: "umhverfisréttur úrskurður", url
    };
  });
}

export function validateAndDedupe(items) {
  const accepted = [], rejected = [], duplicates = [], seen = new Set();
  for (const item of items) {
    const reasons = [];
    if (!item.caseNumber) reasons.push("málsnúmer vantar");
    if (!item.title) reasons.push("titill vantar");
    if (!item.publishedAt) reasons.push("dagsetning vantar eða er ógild");
    let parsedUrl;
    try { parsedUrl = new URL(item.url); } catch { reasons.push("vefslóð er ógild"); }
    if (parsedUrl && (parsedUrl.protocol !== "https:" || !/(^|\.)uua\.is$/i.test(parsedUrl.hostname) || !parsedUrl.pathname.startsWith("/urleits/"))) reasons.push("vefslóð vísar ekki beint í UUA-mál");
    if (reasons.length) { rejected.push({ title: item.title, url: item.url, reasons }); continue; }
    const key = parsedUrl.href.replace(/\/$/, "");
    if (seen.has(key)) { duplicates.push({ title: item.title, url: item.url, key }); continue; }
    seen.add(key); accepted.push(item);
  }
  accepted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { accepted, rejected, duplicates };
}
