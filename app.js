let stories = [
  { category: "samrad", type: "Til samráðs", source: "Samráðsgátt", date: "13. júlí 2026", title: "Breytingar á reglugerðum vegna einföldunar eftirlits", summary: "Drög að breytingum á 57 reglugerðum á sviði hollustuhátta og mengunarvarna.", tags: "mengunarvarnir hollustuhættir eftirlit reglugerðir", url: "https://island.is/samradsgatt/mal/4260" },
  { category: "urskurdur", type: "Úrskurður", source: "UUA", date: "30. júní 2026", title: "UUA2605006 Borgarás", summary: "Kæra vegna dráttar á afgreiðslu kröfu um afturköllun byggingarleyfis og beitingu þvingunarúrræða.", tags: "byggingarleyfi afturköllun málshraði þvingunarúrræði", url: "https://uua.is/urleits/uua2605006-borgaras/" },
  { category: "loggjof", type: "Lög samþykkt", source: "Alþingi", date: "1. júní 2026", title: "Náttúruvernd, Vatnajökulsþjóðgarður og UUA", summary: "Samþykktar breytingar á lögum um náttúruvernd, Vatnajökulsþjóðgarð og úrskurðarnefnd umhverfis- og auðlindamála.", tags: "náttúruvernd Vatnajökulsþjóðgarður kæruheimild lög", url: "https://www.althingi.is/altext/157/s/1259.html" },
  { category: "urskurdur", type: "Bráðabirgðaúrskurður", source: "UUA", date: "20. apríl 2026", title: "UUA2604002 Grensásvegur", summary: "Kæra vegna byggingarleyfis fyrir veitingastað og krafa um stöðvun framkvæmda.", tags: "byggingarleyfi veitingastaður deiliskipulag grenndarkynning", url: "https://uua.is/urleits/uua2604002-grensasvegur/" },
  { category: "urskurdur", type: "Úrskurður", source: "UUA", date: "13. apríl 2026", title: "UUA2603006 Skilti innanhúss", summary: "Úrlausn um hvort auglýsingaskjáir innan við glugga séu háðir byggingarleyfi.", tags: "skilti byggingarleyfi mannvirki umferðaröryggi", url: "https://uua.is/urleits/uua2603006-skilti-innanhuss/" },
  { category: "samrad", type: "Til samráðs", source: "Samráðsgátt", date: "23. mars 2026", title: "Reglugerð um kortlagningu óbyggðra víðerna", summary: "Reglugerðardrög um kortlagningu óbyggðra víðerna á grundvelli náttúruverndarlaga.", tags: "óbyggð víðerni náttúruvernd kortlagning reglugerð", url: "https://island.is/samradsgatt/mal/4212" },
  { category: "urskurdur", type: "Bráðabirgðaúrskurður", source: "UUA", date: "23. mars 2026", title: "UUA2603004 Vetrarmýri og Smalaholt", summary: "Kæra vegna samþykktar deiliskipulags og krafa um frestun réttaráhrifa.", tags: "deiliskipulag frestun réttaráhrifa skipulagsmál", url: "https://uua.is/urleits/uua2603004-vetrarmyri-og-smalaholt/" },
  { category: "urskurdur", type: "Bráðabirgðaúrskurður", source: "UUA", date: "6. mars 2026", title: "UUA2602024 Hlaðbær", summary: "Kæra vegna byggingarleyfis fyrir færanlegar kennslustofur og krafa um stöðvun framkvæmda.", tags: "byggingarleyfi grenndarkynning stöðvun framkvæmda hverfisskipulag", url: "https://uua.is/urleits/uua2602024-hladbaer/" }
];

const feed = document.querySelector("#feed");
const search = document.querySelector("#search");
const count = document.querySelector("#result-count");
const empty = document.querySelector("#empty-state");
const dataStatus = document.querySelector("#data-status");
let activeCategory = "all";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

function formatIcelandicDate(value) {
  const months = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const localMatch = String(value || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (localMatch) return `${Number(localMatch[1])}. ${months[Number(localMatch[2]) - 1]} ${localMatch[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Dagsetning ótilgreind";
  return `${date.getUTCDate()}. ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase("is");
  const filtered = stories.filter((story) => {
    const inCategory = activeCategory === "all" || story.category === activeCategory;
    const haystack = `${story.title} ${story.summary} ${story.tags} ${story.source}`.toLocaleLowerCase("is");
    return inCategory && haystack.includes(query);
  });

  feed.innerHTML = filtered.map((story) => `
    <a class="story" href="${escapeHtml(story.url)}" target="_blank" rel="noopener noreferrer">
      <div class="story-meta">${escapeHtml(story.type)}<span class="story-source">${escapeHtml(story.source)} · ${escapeHtml(story.date)}</span></div>
      <div><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.summary)} <strong>Reifun bíður yfirferðar.</strong></p></div>
      <span class="story-arrow" aria-hidden="true">↗</span>
    </a>
  `).join("");
  count.textContent = filtered.length;
  empty.hidden = filtered.length !== 0;
}

document.querySelectorAll(".chip").forEach((button) => button.addEventListener("click", () => {
  document.querySelector(".chip.active").classList.remove("active");
  button.classList.add("active");
  activeCategory = button.dataset.category;
  render();
}));
search.addEventListener("input", render);
document.querySelector("#filter-toggle").addEventListener("click", (event) => {
  const filters = document.querySelector("#filters");
  const isOpen = filters.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", isOpen);
  event.currentTarget.querySelector("span").textContent = isOpen ? "−" : "+";
});
render();

async function loadMonitoring() {
  const sources = await Promise.all(["uua", "samrad"].map(async (name) => {
    try {
      const response = await fetch(`./data/${name}.json`, { cache: "no-store" });
      if (!response.ok) return null;
      return response.json();
    } catch { return null; }
  }));
  const available = sources.filter(Boolean);
  if (available.length) {
    const imported = available.flatMap((data) => data.items || []).sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "")).map((item) => {
      const published = item.publishedAt ? formatIcelandicDate(item.publishedAt) : "Dagsetning ótilgreind";
      const deadline = item.deadline ? formatIcelandicDate(item.deadline) : "";
      return { ...item, date: deadline ? `${published} · frestur ${deadline}` : published };
    });
    const known = new Set(imported.map((item) => item.url));
    stories = [...imported, ...stories.filter((item) => !known.has(item.url))];
    dataStatus.textContent = `Vöktun virk · ${available.map((data) => `${data.source}: ${data.items.length}`).join(" · ")}`;
    render();
  } else {
    dataStatus.textContent = "Sýnigögn · vöktun bíður næstu keyrslu";
  }
}

loadMonitoring();
