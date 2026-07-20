import { extractKeywords, plainText, summarize } from "./uua-lib.mjs";

function decode(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#0*38;/g, "&");
}

function field(xml, tag) {
  const safe = tag.replace(":", "\\:");
  return decode(xml.match(new RegExp(`<${safe}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safe}>`, "i"))?.[1]?.trim() || "");
}

function directLink(item) {
  const normal = field(item, "link");
  const atom = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  return (normal || atom).replace(/&amp;/g, "&").trim();
}

export function parseSamradFeed(xml) {
  if (!/<(?:rss|feed)\b/i.test(xml)) throw new Error("Svarið er ekki gildur RSS- eða Atom-straumur.");
  const blocks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map((match) => match[1]);
  return blocks.map((item) => {
    const title = plainText(field(item, "title"));
    const url = directLink(item);
    const raw = field(item, "description") || field(item, "summary") || field(item, "content");
    const categories = [...item.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((match) => plainText(decode(match[1]))).join(" ");
    const searchable = `${title} ${plainText(raw)} ${categories}`;
    const published = field(item, "pubDate") || field(item, "dc:date") || field(item, "publishDate") || field(item, "publicationDate") || field(item, "created") || field(item, "date") || field(item, "published") || field(item, "updated");
    const date = new Date(published);
    const caseNumber = searchable.match(/\bS-\d+\/\d{4}\b/i)?.[0]?.toUpperCase() || "";
    const deadline = field(item, "endDate") || field(item, "deadline") || searchable.match(/(?:umsagnarfrest(?:ur)?|til umsagnar)[^\d]{0,20}(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1] || "";
    const tags = extractKeywords(searchable);
    return {
      id: url, caseNumber, category: "samrad", type: "Til samráðs", source: "Samráðsgátt",
      publishedAt: Number.isNaN(date.valueOf()) ? "" : date.toISOString(), deadline,
      title, summary: summarize(raw) || title, tags, url, relevant: Boolean(tags)
    };
  });
}

export function validateSamrad(items) {
  const accepted = [], rejected = [], ignored = [], duplicates = [], seen = new Set();
  for (const item of items) {
    if (!item.relevant) { ignored.push({ title: item.title, url: item.url, reason: "utan vaktaðra efnisorða" }); continue; }
    const reasons = [];
    if (!item.title) reasons.push("titill vantar");
    let parsed;
    try { parsed = new URL(item.url); } catch { reasons.push("vefslóð er ógild"); }
    if (parsed && (parsed.protocol !== "https:" || parsed.hostname !== "island.is" || !/^\/samradsgatt\/mal\/\d+\/?$/.test(parsed.pathname))) reasons.push("vefslóð vísar ekki beint í mál");
    if (reasons.length) { rejected.push({ title: item.title, url: item.url, reasons }); continue; }
    const key = parsed.href.replace(/\/$/, "");
    if (seen.has(key)) { duplicates.push({ title: item.title, url: item.url }); continue; }
    seen.add(key); accepted.push(item);
  }
  accepted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { accepted, rejected, ignored, duplicates };
}

function findCaseObject(value, caseId) {
  if (!value || typeof value !== "object") return null;
  if (String(value.id) === String(caseId) && (value.caseNumber || value.processBegins || value.shortDescription)) return value;
  for (const child of Object.values(value)) {
    const found = findCaseObject(child, caseId);
    if (found) return found;
  }
  return null;
}

function asIso(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

export function parseSamradDetail(html, caseId) {
  const script = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (script) {
    try {
      const record = findCaseObject(JSON.parse(script), caseId);
      if (record) {
        const detailText = `${record.name || ""} ${record.shortDescription || ""} ${record.detailedDescription || ""} ${record.policyAreaName || ""}`;
        return {
          caseNumber: record.caseNumber || "",
          publishedAt: asIso(record.processBegins || record.created),
          deadline: asIso(record.processEnds),
          summary: summarize(record.shortDescription || record.detailedDescription || record.name || ""),
          tags: extractKeywords(detailText),
          status: record.statusName || "",
          institution: record.institutionName || "",
          policyArea: record.policyAreaName || ""
        };
      }
    } catch { /* Nota textavaramöguleika fyrir neðan. */ }
  }

  const text = plainText(html);
  const published = text.match(/Birt:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)?.[1] || "";
  const timeline = text.match(/Til umsagnar\s*[*•-]?\s*(\d{1,2}\.\d{1,2}\.(?:\d{4})?)\s*[–-]\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
  const caseNumber = text.match(/Mál nr\.\s*(S-\d+\/\d{4})/i)?.[1] || "";
  const subject = text.match(/Málsefni\s+([\s\S]{1,600}?)(?:Nánari upplýsingar|Samráði lokið|Umsjónaraðili)/i)?.[1]?.trim() || "";
  return { caseNumber, publishedAt: published, deadline: timeline?.[2] || "", summary: summarize(subject), tags: extractKeywords(text), status: "", institution: "", policyArea: "" };
}
