//Sett teljarinn
var clicks = 0;
function hello() {
  clicks += 1;
  document.getElementById("clicks").innerHTML = clicks;
}
function bye() {
  clicks += -1;
  document.getElementById("clicks").innerHTML = clicks;
}
function reset() {
  clicks = 0;
  document.getElementById("clicks").innerHTML = clicks;
}

//Sekúnduteljarinn

const out = document.querySelector(".telja");
const btn = document.querySelector(".teljast");

let timer, startTime;

btn.addEventListener("click", () => {
  // If timer is started, reset
  if (timer) {
    clearInterval(timer);
  }
  startTime = Date.now();
  localStorage.setItem("startTime", startTime);

  timer = setInterval(() => {
    const now = Date.now();
    const millis = now - Number(localStorage.startTime);
    const seconds = Math.floor((millis / 1000) % 60);
    const minutes = Math.floor((millis / 1000 / 60) % 60);
    out.innerText = minutes + ":" + seconds;
  }, 1000);

  console.log("Started interval timer", timer);
});
