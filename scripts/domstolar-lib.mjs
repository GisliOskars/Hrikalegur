import { extractKeywords, plainText, summarize } from "./uua-lib.mjs";

function decode(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&");
}

function field(xml, tag) {
  const safe = tag.replace(":", "\\:");
  return decode(xml.match(new RegExp(`<${safe}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safe}>`, "i"))?.[1]?.trim() || "");
}

export function parseDomstolarFeed(xml, court) {
  if (!/<rss\b/i.test(xml) || !/<channel>/i.test(xml)) throw new Error("Svarið er ekki gildur RSS-straumur.");
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const title = plainText(field(item, "title"));
    const url = plainText(field(item, "link"));
    const description = plainText(field(item, "description"));
    const date = new Date(plainText(field(item, "pubDate")));
    return {
      id: url,
      caseNumber: title,
      category: "domur",
      type: "Dómur/úrskurður",
      source: court,
      publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(),
      title: `${title} · ${court}`,
      summary: summarize(description) || title,
      tags: "",
      url,
      relevant: false
    };
  });
}

function findVerdict(value) {
  if (!value || typeof value !== "object") return null;
  if (value.caseNumber && value.verdictDate && (value.presentings || value.keywords || value.court)) return value;
  for (const child of Object.values(value)) {
    const found = findVerdict(child);
    if (found) return found;
  }
  return null;
}

export function parseDomstolarDetail(html) {
  const script = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!script) throw new Error("Dómasíðan inniheldur ekki væntanleg gögn.");
  const verdict = findVerdict(JSON.parse(script));
  if (!verdict) throw new Error("Dómsgögn fundust ekki á síðunni.");
  const courtKeywords = Array.isArray(verdict.keywords) ? verdict.keywords.join(" ") : "";
  const searchable = `${verdict.title || ""} ${verdict.presentings || ""} ${courtKeywords}`;
  const tags = extractKeywords(searchable);
  const date = new Date(verdict.verdictDate || "");
  return {
    caseNumber: String(verdict.caseNumber || ""),
    court: verdict.court || "",
    publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(),
    parties: plainText(verdict.title || ""),
    summary: summarize(verdict.presentings || verdict.title || ""),
    tags,
    courtKeywords,
    relevant: Boolean(tags)
  };
}

export function validateDomstolar(items) {
  const accepted = [], rejected = [], ignored = [], duplicates = [], seen = new Set();
  for (const item of items) {
    if (!item.relevant) {
      ignored.push({ title: item.title, url: item.url, reason: "utan vaktaðra efnisorða" });
      continue;
    }
    const reasons = [];
    if (!/^\d+\/\d{4}$/.test(item.caseNumber)) reasons.push("málsnúmer vantar eða er ógilt");
    if (!item.publishedAt) reasons.push("dagsetning vantar eða er ógild");
    let parsed;
    try { parsed = new URL(item.url); } catch { reasons.push("vefslóð er ógild"); }
    if (parsed && (parsed.protocol !== "https:" || parsed.hostname !== "island.is" || !/^\/domar\/[gs]-[0-9a-f-]+\/?$/i.test(parsed.pathname))) {
      reasons.push("vefslóð vísar ekki beint í dóm");
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
