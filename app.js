const stories = [
  { category: "urskurdur", type: "Úrskurður", source: "UUA", date: "16. júlí 2026", title: "Byggingarleyfi og stöðvun framkvæmda", summary: "Nýr úrskurður um byggingarleyfi, málsmeðferð og kröfu um stöðvun framkvæmda.", tags: "byggingarleyfi stöðvun framkvæmda mannvirki", url: "https://uua.is/listi-yfir-urskurdi/" },
  { category: "samrad", type: "Til samráðs", source: "Samráðsgátt", date: "14. júlí 2026", title: "Drög að breytingu á reglugerð um umhverfismat", summary: "Tillaga hefur verið birt til umsagnar. Umsagnarfrestur er sýndur í frumheimild.", tags: "umhverfismat reglugerð umsögn", url: "https://island.is/samradsgatt" },
  { category: "domur", type: "Dómur", source: "Dómstólar", date: "10. júlí 2026", title: "Ágreiningur um gildi deiliskipulags", summary: "Dómur sem varðar málsmeðferð við skipulagsákvörðun og lögvarða hagsmuni.", tags: "deiliskipulag málsmeðferð skipulagsmál", url: "https://island.is/s/domstolar" },
  { category: "loggjof", type: "Þingmál", source: "Alþingi", date: "30. júní 2026", title: "Breytingar á lögum um náttúruvernd", summary: "Þingmál á sviði náttúruverndar. Staða máls og öll þingskjöl eru í frumheimild.", tags: "náttúruvernd frumvarp lög", url: "https://www.althingi.is/" },
  { category: "urskurdur", type: "Úrskurður", source: "UUA", date: "27. júní 2026", title: "Grenndarkynning vegna breytinga á mannvirki", summary: "Úrlausn um grenndarkynningu, hagsmuni nágranna og gildi byggingarleyfis.", tags: "grenndarkynning byggingarleyfi nágrannar", url: "https://uua.is/listi-yfir-urskurdi/" },
  { category: "samrad", type: "Stefnumótun", source: "Stjórnarráðið", date: "23. júní 2026", title: "Endurskoðun á stefnu um meðhöndlun úrgangs", summary: "Kynning á vinnu stjórnvalda við endurskoðun stefnu og fyrirhuguðum næstu skrefum.", tags: "úrgangur stefnumótun hringrásarhagkerfi", url: "https://www.stjornarradid.is/" },
  { category: "urskurdur", type: "Úrskurður", source: "UUA", date: "12. júní 2026", title: "Deiliskipulag athafnasvæðis við Ofanleiti", summary: "Kæra vegna samþykktar deiliskipulags og breytingar á skipulagi frístundabyggðar.", tags: "deiliskipulag frístundabyggð umhverfismat", url: "https://uua.is/urleits/" },
  { category: "loggjof", type: "Nefndarálit", source: "Alþingi", date: "8. júní 2026", title: "Nefndarálit um breytingar á skipulagslögum", summary: "Nefndarálit og tillögur að breytingum á fyrirliggjandi frumvarpi.", tags: "skipulagslög nefndarálit breytingartillaga", url: "https://www.althingi.is/" }
];

const feed = document.querySelector("#feed");
const search = document.querySelector("#search");
const count = document.querySelector("#result-count");
const empty = document.querySelector("#empty-state");
let activeCategory = "all";

function render() {
  const query = search.value.trim().toLocaleLowerCase("is");
  const filtered = stories.filter((story) => {
    const inCategory = activeCategory === "all" || story.category === activeCategory;
    const haystack = `${story.title} ${story.summary} ${story.tags} ${story.source}`.toLocaleLowerCase("is");
    return inCategory && haystack.includes(query);
  });

  feed.innerHTML = filtered.map((story) => `
    <a class="story" href="${story.url}" target="_blank" rel="noopener noreferrer">
      <div class="story-meta">${story.type}<span class="story-source">${story.source} · ${story.date}</span></div>
      <div><h3>${story.title}</h3><p>${story.summary} <strong>Reifun bíður yfirferðar.</strong></p></div>
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
