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

const keywordRules = [
  ["byggingarleyfi", /byggingarleyf/i], ["framkvæmdaleyfi", /framkvæmdaleyf/i],
  ["deiliskipulag", /deiliskipulag/i], ["aðalskipulag", /aðalskipulag/i],
  ["svæðisskipulag", /svæðisskipulag/i], ["grenndarkynning", /grenndarkynn/i],
  ["náttúruvernd", /náttúruvernd/i], ["mat á umhverfisáhrifum", /umhverfisáhrif/i],
  ["loftslagsmál", /loftslag/i], ["líffræðileg fjölbreytni", /líffræðileg.*fjölbreytni|líffjölbreytni/i],
  ["landnotkun", /landnotkun/i], ["skógrækt", /skógrækt|skógareyðing/i],
  ["hollustuhættir", /hollustuhátt/i], ["mannvirki", /mannvirk/i],
  ["skipulagsmál", /skipulagsmál|skipulagslög/i], ["landgræðsla", /landgræðsl|uppgræðsl/i],
  ["efnistaka", /efnistök/i], ["haf- og strandsvæði", /strandsvæð|hafskipulag/i],
  ["mengunarvarnir", /mengun|mengandi starfsemi/i], ["starfsleyfi", /starfsleyf/i],
  ["úrgangur", /úrgang/i], ["fráveita", /fráveit|seyru/i], ["vatnsvernd", /vatnsvernd/i],
  ["veiðar", /veið/i], ["dýravelferð", /dýravelferð|hundahaldi|aflífun/i],
  ["sjókvíaeldi", /sjókvíaeldi|fiskeldi/i], ["vegagerð", /vegagerð|veglagning/i],
  ["virkjunarkostur", /virkjunarkost/i], ["orkumál", /virkjun|rafork|orkumannvirk|orkunýtni|endurnýjanleg.*orka/i],
  ["þvingunarúrræði", /þvingunarúrræð/i],
  ["stöðvun framkvæmda", /stöðvun framkvæmd/i], ["frestun réttaráhrifa", /frestun réttaráhrif/i],
  ["málshraði", /málshrað|drátt á afgreiðslu/i], ["kæruheimild", /kæruheimild/i]
];

export function extractMatterSummary(content, fallback) {
  const candidates = [...content.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)].map((match) => plainText(match[1]));
  const matter = candidates.find((value) => /mál nr\.|kæra|kröfu|beiðni/i.test(value));
  return summarize((matter || plainText(content).slice(0, 1800) || fallback).replace(/^Fyrir var tekið\s*/i, ""));
}

export function extractKeywords(content) {
  const text = plainText(content);
  return keywordRules.filter(([, pattern]) => pattern.test(text)).map(([keyword]) => keyword).join(" ");
}

export function parseUuaFeed(xml) {
  if (!/<rss\b/i.test(xml) || !/<channel>/i.test(xml)) throw new Error("Svarið er ekki gildur RSS-straumur.");
  const rawItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return rawItems.map((item) => {
    const title = plainText(field(item, "title"));
    const url = field(item, "link").trim();
    const published = field(item, "pubDate");
    const description = field(item, "description");
    const content = field(item, "content:encoded") || description;
    const caseNumber = title.match(/\b(?:UUA\d{7}|\d{1,3}\/\d{4})\b/i)?.[0]?.toUpperCase() ?? "";
    const date = new Date(published);
    return {
      id: url, caseNumber, category: "urskurdur",
      type: /bráðabirgða/i.test(description) ? "Bráðabirgðaúrskurður" : "Úrskurður",
      source: "UUA", publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(),
      title,
      summary: extractMatterSummary(content, description),
      tags: `umhverfisréttur úrskurður ${extractKeywords(content)}`.trim(),
      url
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
