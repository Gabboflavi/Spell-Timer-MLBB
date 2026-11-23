// Draft simulator. Loaded after heroes.js and ui.js.

/* ---------- Settings ---------- */

// Draft orders. Each step is [team, "ban" | "pick"].
const FORMATS = {
  tournament: {
    label: "Tournament",
    steps: [
      ["blue", "ban"], ["red", "ban"], ["blue", "ban"], ["red", "ban"], ["blue", "ban"], ["red", "ban"],
      ["blue", "pick"], ["red", "pick"], ["red", "pick"], ["blue", "pick"], ["blue", "pick"], ["red", "pick"],
      ["red", "ban"], ["blue", "ban"], ["red", "ban"], ["blue", "ban"],
      ["red", "pick"], ["blue", "pick"], ["blue", "pick"], ["red", "pick"],
    ],
  },
  ranked: {
    label: "Ranked",
    steps: [
      // Bans: 3 blue, 3 red, then 2 blue, 2 red
      ["blue", "ban"], ["blue", "ban"], ["blue", "ban"],
      ["red", "ban"], ["red", "ban"], ["red", "ban"],
      ["blue", "ban"], ["blue", "ban"],
      ["red", "ban"], ["red", "ban"],
      ["blue", "pick"], ["red", "pick"], ["red", "pick"], ["blue", "pick"], ["blue", "pick"],
      ["red", "pick"], ["red", "pick"], ["blue", "pick"], ["blue", "pick"], ["red", "pick"],
    ],
  },
};

const MODES = { both: "Draft both", blue: "Play Blue", red: "Play Red" };
const FIRST_PICK = { blue: "Blue", red: "Red", random: "Random" };
const ROLES = Object.keys(HERO_ROLES);
const TURN_SECONDS = 30;
const AI_DELAY = 900; // ms the computer "thinks" before choosing

/* ---------- State ---------- */

const state = {
  format: "tournament",
  first: "blue",     // first-pick setting: "blue", "red" or "random"
  firstTeam: "blue", // team actually going first this draft (decided on reset)
  mode: "both",      // which team you control ("both", "blue" or "red")
  timer: false,
  actions: [],       // one entry per finished step: hero name, or null for a skipped ban
  fresh: -1,         // index of the step just filled (for its animation)
  lanes: { blue: {}, red: {} }, // lanes you chose: team -> { hero name: lane }
  role: "All",
  search: "",
};
let steps = [];      // current format's steps, with slot numbers and phase names
let aiTimeout = null;
let deadline = 0;
let lastTurnKey = "";

const heroByName = Object.fromEntries(HEROES.map(h => [h.name, h]));

// Hero pictures, looked up once per hero: slug -> file path, or null if there isn't one
const heroImageSrc = {};
const heroImageWaiting = {}; // slug -> callbacks waiting for the lookup to finish

function findHeroImage(hero, onFound) {
  const slug = hero.slug;
  if (heroImageWaiting[slug]) { heroImageWaiting[slug].push(onFound); return; }
  heroImageWaiting[slug] = [onFound];
  const tryExt = i => {
    if (i >= HERO_IMAGE_EXTS.length) { heroImageSrc[slug] = null; delete heroImageWaiting[slug]; return; }
    const path = `heroes/${slug}.${HERO_IMAGE_EXTS[i]}`;
    const probe = new Image();
    probe.onload = () => {
      heroImageSrc[slug] = path;
      heroImageWaiting[slug].forEach(cb => cb(path));
      delete heroImageWaiting[slug];
    };
    probe.onerror = () => tryExt(i + 1);
    probe.src = path;
  };
  tryExt(0);
}

/* ---------- Helpers ---------- */

// Add slot numbers ("Blue's 2nd ban") and phase names to a format's steps.
// Formats are written with Blue going first. Bans always keep that order;
// if Red has first pick, only the picks swap teams.
function prepareSteps(format, firstTeam) {
  const count = {};
  const phaseCount = { ban: 0, pick: 0 };
  let prevType = null;
  const swap = firstTeam === "red";
  return FORMATS[format].steps.map(([written, type]) => {
    const team = swap && type === "pick" ? (written === "blue" ? "red" : "blue") : written;
    const key = team + type;
    count[key] = (count[key] || 0);
    if (type !== prevType) phaseCount[type]++;
    prevType = type;
    return { team, type, slot: count[key]++, phase: `${type === "ban" ? "Ban" : "Pick"} phase ${phaseCount[type]}` };
  });
}

const currentStep = () => steps[state.actions.length] || null;
const isDone = () => state.actions.length >= steps.length;
const isAITurn = () => {
  const step = currentStep();
  return !!step && state.mode !== "both" && step.team !== state.mode;
};
const usedHeroes = () => new Set(state.actions.filter(Boolean));
const available = () => { const used = usedHeroes(); return HEROES.filter(h => !used.has(h.name)); };
const cap = s => s[0].toUpperCase() + s.slice(1);
const ordinal = n => n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th"); // slots only go up to 5

function initials(name) {
  const words = name.split(/[\s\-.]+/).filter(w => w && w.toLowerCase() !== "and");
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2);
}

// Round hero picture: an image from heroes/ if enabled, otherwise colored initials
function makePortrait(hero) {
  const el = document.createElement("span");
  el.className = "portrait";
  el.dataset.role = hero.role;
  el.textContent = initials(hero.name);
  const src = heroImageSrc[hero.slug];
  if (src) {
    // Already found this hero's picture earlier: show it straight away
    const img = new Image();
    img.alt = "";
    img.src = src;
    el.replaceChildren(img);
  } else if (src === undefined) {
    findHeroImage(hero, found => {
      const img = new Image();
      img.alt = "";
      img.src = found;
      el.replaceChildren(img);
    });
  }
  return el;
}

/* ---------- Making a choice ---------- */

function choose(heroName) {
  if (isDone()) return;
  if (heroName && usedHeroes().has(heroName)) return;
  state.actions.push(heroName);
  state.fresh = state.actions.length - 1;
  startTurn();
}

// The computer's choice: bans are random; picks fill a role the team doesn't have yet
function aiChoice() {
  const step = currentStep();
  const pool = available();
  if (step.type === "pick") {
    const have = new Set(teamHeroes(step.team, "pick").map(h => h.role));
    const wanted = ["Tank", "Fighter", "Assassin", "Mage", "Marksman"].filter(r =>
      !(have.has(r) || (r === "Tank" && have.has("Support"))));
    const fits = pool.filter(h => wanted.includes(h.role) || (wanted.includes("Tank") && h.role === "Support"));
    if (fits.length) return fits[Math.floor(Math.random() * fits.length)].name;
  }
  return pool[Math.floor(Math.random() * pool.length)].name;
}

// Heroes a team has banned or picked so far
function teamHeroes(team, type) {
  return steps
    .map((s, i) => ({ s, hero: state.actions[i] }))
    .filter(({ s, hero }) => s.team === team && s.type === type && hero)
    .map(({ hero }) => heroByName[hero]);
}

// Called whenever a new step begins (or the draft is reset/undone)
function startTurn() {
  clearTimeout(aiTimeout);
  deadline = state.timer && !isDone() ? Date.now() + TURN_SECONDS * 1000 : 0;
  render();
  if (isAITurn()) aiTimeout = setTimeout(() => choose(aiChoice()), AI_DELAY);
}

// Timer ran out: a ban is skipped, a pick goes to a random hero
function timeUp() {
  const step = currentStep();
  if (!step) return;
  choose(step.type === "ban" ? null : aiChoice());
}

function undo() {
  if (!state.actions.length) return;
  // Also take back the computer's moves, so it's your turn again
  do { state.actions.pop(); } while (state.actions.length && isAITurn());
  state.fresh = -1;
  startTurn();
}

function reset() {
  state.actions = [];
  state.fresh = -1;
  state.lanes = { blue: {}, red: {} };
  state.firstTeam = state.first === "random"
    ? (Math.random() < .5 ? "blue" : "red")
    : state.first;
  steps = prepareSteps(state.format, state.firstTeam);
  startTurn();
}

/* ---------- Rendering ---------- */

/* ---------- Lanes ---------- */

// Forget chosen lanes for heroes that are no longer picked (after undo)
function cleanLanes() {
  ["blue", "red"].forEach(team => {
    const picked = new Set(teamHeroes(team, "pick").map(h => h.name));
    Object.keys(state.lanes[team]).forEach(name => { if (!picked.has(name)) delete state.lanes[team][name]; });
  });
}

// Choose a lane for a hero. If a teammate already has that lane, they swap.
function setLane(team, heroName, lane) {
  const lanes = state.lanes[team];
  if (!lane) { delete lanes[heroName]; }
  else {
    const holder = Object.keys(lanes).find(n => n !== heroName && lanes[n] === lane);
    if (holder) {
      if (lanes[heroName]) lanes[holder] = lanes[heroName];
      else delete lanes[holder];
    }
    lanes[heroName] = lane;
  }
  state.fresh = -1;
  render();
}

// Dropdown under a picked hero: "Auto (Mid)" or a lane you chose
function laneSelect(team, hero, auto) {
  const select = document.createElement("select");
  select.className = "lane-select";
  select.setAttribute("aria-label", `Lane for ${hero.name}`);
  const chosen = state.lanes[team][hero.name] || "";
  const options = [["", `Auto${auto ? ` · ${auto.lane}` : ""}`], ...LANES.map(l => [l, l])];
  options.forEach(([value, label]) => {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    if (value === chosen) o.selected = true;
    select.append(o);
  });
  select.classList.toggle("chosen", !!chosen);
  if (auto) select.dataset.fit = auto.fit;
  select.addEventListener("change", () => setLane(team, hero.name, select.value));
  return select;
}

function renderTeam(team) {
  const bansEl = document.querySelector(`.bans[data-team="${team}"]`);
  const picksEl = document.querySelector(`.picks[data-team="${team}"]`);
  bansEl.replaceChildren();
  picksEl.replaceChildren();
  const now = state.actions.length;
  // Current lane for every picked hero (chosen ones kept, the rest suggested)
  const laneOf = {};
  assignLanes(teamHeroes(team, "pick"), state.lanes[team]).lanes.forEach(l => { laneOf[l.hero.name] = l; });

  steps.forEach((step, i) => {
    if (step.team !== team) return;
    const filled = i < now;
    const hero = filled ? heroByName[state.actions[i]] : null;
    const isCurrent = i === now;

    if (step.type === "ban") {
      const el = document.createElement("div");
      el.className = "ban";
      if (hero) { el.classList.add("filled"); el.append(makePortrait(hero)); el.title = `Banned: ${hero.name}`; }
      else if (filled) { el.classList.add("skipped"); el.textContent = "—"; el.title = "Ban skipped"; }
      else el.title = `${ordinal(step.slot + 1)} ban`;
      if (isCurrent) el.classList.add("current");
      if (i === state.fresh) el.classList.add("fresh");
      bansEl.append(el);
    } else {
      const el = document.createElement("li");
      el.className = "pick";
      if (hero) {
        el.append(makePortrait(hero));
        const who = document.createElement("div");
        who.className = "who";
        who.innerHTML = `<strong></strong><span></span>`;
        who.querySelector("strong").textContent = hero.name;
        who.querySelector("span").textContent = hero.role;
        el.append(who, laneSelect(team, hero, laneOf[hero.name]));
      } else {
        el.innerHTML = `<span class="empty-dot">${step.slot + 1}</span><div class="who"><span>${isCurrent ? "Picking…" : "Pick " + (step.slot + 1)}</span></div>`;
      }
      if (isCurrent) el.classList.add("current");
      if (i === state.fresh) el.classList.add("fresh");
      picksEl.append(el);
    }
  });
}

function renderTurn() {
  const step = currentStep();
  const turn = $("turn");
  turn.className = "turn";
  if (!step) {
    turn.classList.add("done");
    $("turnTeam").textContent = "Draft complete";
    $("turnAction").textContent = "Undo or reset to draft again";
    $("phase").textContent = "";
  } else {
    turn.classList.add(step.team);
    const who = state.mode === "both" ? `${cap(step.team)} team`
              : step.team === state.mode ? "Your turn" : `${cap(step.team)} team (computer)`;
    $("turnTeam").textContent = who;
    $("turnAction").textContent = `${step.type === "ban" ? "Ban" : "Pick"} a hero · step ${state.actions.length + 1} of ${steps.length}`;
    $("phase").textContent = step.phase;
  }
  // Animate the banner only when the turn actually changes
  const key = step ? `${state.actions.length}` : "done";
  if (key !== lastTurnKey) { flash(turn, "changed"); lastTurnKey = key; }

  document.querySelectorAll(".team").forEach(el =>
    el.classList.toggle("active", !!step && el.classList.contains(step.team)));

  // Timeline of every step
  const tl = $("timeline");
  tl.replaceChildren(...steps.map((s, i) => {
    const li = document.createElement("li");
    li.className = `${s.team} t-${s.type}`;
    if (i < state.actions.length) li.classList.add("done");
    if (i === state.actions.length) li.classList.add("now");
    li.textContent = s.type === "ban" ? "B" : "P";
    li.title = `${cap(s.team)} ${s.type}`;
    return li;
  }));
}

function renderPool() {
  const used = usedHeroes();
  const teamOf = {};
  steps.forEach((s, i) => { if (s.type === "pick" && state.actions[i]) teamOf[state.actions[i]] = s.team; });
  const q = state.search.trim().toLowerCase();
  const waiting = isAITurn();

  let visible = 0;
  document.querySelectorAll(".hero").forEach(btn => {
    const name = btn.dataset.name;
    const show = (state.role === "All" || btn.dataset.role === state.role) && name.toLowerCase().includes(q);
    btn.classList.toggle("hidden", !show);
    btn.disabled = used.has(name) || isDone();
    btn.classList.toggle("taken-blue", teamOf[name] === "blue");
    btn.classList.toggle("taken-red", teamOf[name] === "red");
    if (show) visible++;
  });
  $("heroGrid").classList.toggle("waiting", waiting);
  $("poolHint").textContent = visible ? (waiting ? "The computer is choosing…" : "") : "No heroes match your search.";

  document.querySelectorAll("#roleBtns button").forEach(b => b.setAttribute("aria-pressed", b.dataset.role === state.role));
}

/* ---------- Post-draft analysis (logic is in analysis.js) ---------- */

let analyzedKey = "";

function renderSummary() {
  const done = isDone();
  $("summary").hidden = !done;
  if (!done) { analyzedKey = ""; return; }

  // Only rebuild (and re-animate) when the finished draft is a different one
  const key = state.format + state.firstTeam + state.actions.join("|") + JSON.stringify(state.lanes);
  if (key === analyzedKey) return;
  const firstTime = !analyzedKey;
  analyzedKey = key;

  const result = analyzeDraft(teamHeroes("blue", "pick"), teamHeroes("red", "pick"), state.lanes.blue, state.lanes.red);
  const verdict = $("verdict");
  verdict.textContent = result.verdict.text;
  verdict.className = `verdict ${result.verdict.team || "even"}`;

  renderTeamAnalysis("blue", result.blue, "anaBlue");
  renderTeamAnalysis("red", result.red, "anaRed");
  // Scroll to the analysis when the draft finishes, not on every lane change
  if (firstTime) $("summary").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function renderTeamAnalysis(team, a, elId) {
  const el = $(elId);
  const other = team === "blue" ? "Red" : "Blue";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const list = items => items.map((t, i) => `<li style="animation-delay:${.35 + i * .06}s">${esc(t)}</li>`).join("");
  const meter = (label, value) => `
    <div class="meter">
      <span class="m-label">${label}</span>
      <span class="m-track"><span class="m-fill" data-w="${value}"></span></span>
      <span class="m-val">${value}</span>
    </div>`;
  const counts = {};
  a.heroes.forEach(h => { counts[h.role] = (counts[h.role] || 0) + 1; });
  const magic = Math.round(a.magicShare * 100);

  el.innerHTML = `
    <div class="comp-head">
      <strong>${cap(team)} team</strong>
      <span class="rating"><span class="rating-num" id="rating-${team}">0</span><small>/100</small></span>
    </div>
    <div class="roles">
      ${Object.entries(counts).map(([r, n]) => `<span class="chip" data-role="${r}">${n > 1 ? n + "× " : ""}${r}</span>`).join("")}
      <span class="chip curve">${a.curve}</span>
    </div>

    ${meter("Lanes", a.scores.lanes)}
    ${meter("Crowd control", a.scores.cc)}
    ${meter("Damage mix", a.scores.damage)}
    ${meter("Frontline", a.scores.frontline)}

    <div class="split" title="Physical vs magic damage">
      <span class="split-phys" data-w="${100 - magic}"></span><span class="split-mag" data-w="${magic}"></span>
    </div>
    <div class="split-labels"><span>Physical ${100 - magic}%</span><span>Magic ${magic}%</span></div>

    <h3>Lanes</h3>
    <ul class="lanes">
      ${a.lanes.lanes.map((l, i) => `
        <li class="fit-${l.fit}" style="animation-delay:${.25 + i * .05}s">
          <span class="lane">${l.lane}</span>
          <span class="lane-hero">${esc(l.hero.name)}${l.chosen ? "" : ' <em>suggested</em>'}</span>
        </li>`).join("")}
    </ul>

    ${a.good.length ? `<h3>Strengths</h3><ul class="notes good">${list(a.good)}</ul>` : ""}
    ${a.bad.length ? `<h3>Weaknesses</h3><ul class="notes bad">${list(a.bad)}</ul>` : ""}
    <h3>Tips vs ${other}</h3><ul class="notes tip">${list(a.tips)}</ul>
  `;

  // Count the rating up and grow the bars from zero
  shown[`rating-${team}`] = 0;
  animateValue(`rating-${team}`, a.overall, v => Math.round(v));
  const grow = () => el.querySelectorAll("[data-w]").forEach(bar => { bar.style.width = `${bar.dataset.w}%`; });
  requestAnimationFrame(() => requestAnimationFrame(grow));
  setTimeout(grow, 120); // in case animation frames are paused (hidden tab)
}

function renderControls() {
  document.querySelectorAll("#formatBtns button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === state.format));
  document.querySelectorAll("#modeBtns button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === state.mode));
  document.querySelectorAll("#firstBtns button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === state.first));
  // With Random, show which team it landed on
  const randomBtn = document.querySelector('#firstBtns button[data-v="random"]');
  randomBtn.textContent = state.first === "random" ? `Random: ${cap(state.firstTeam)}` : "Random";
  $("timerBtn").setAttribute("aria-pressed", state.timer);
  $("timerBtn").textContent = state.timer ? `${TURN_SECONDS}s` : "Off";
  $("undoBtn").disabled = !state.actions.length;
  $("timer").hidden = !state.timer || isDone();
}

function render() {
  cleanLanes();
  renderControls();
  renderTeam("blue");
  renderTeam("red");
  renderTurn();
  renderPool();
  renderSummary();
  tickTimer();
}

/* ---------- Timer ---------- */

function tickTimer() {
  if (!deadline) return;
  const left = Math.max(0, deadline - Date.now());
  const step = currentStep();
  $("timerBar").style.width = `${(left / (TURN_SECONDS * 1000)) * 100}%`;
  $("timerBar").style.setProperty("--team-color", step ? `var(--${step.team})` : "var(--accent)");
  $("timerText").textContent = `${Math.ceil(left / 1000)}s`;
  $("timer").classList.toggle("low", left <= 5000);
  if (left === 0) { deadline = 0; timeUp(); }
}
setInterval(tickTimer, 200);

/* ---------- Building the controls ---------- */

function segButtons(containerId, options, onPick) {
  const box = $(containerId);
  Object.entries(options).forEach(([value, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tog";
    b.dataset.v = value;
    b.textContent = label;
    b.addEventListener("click", () => { flash(b, "picked"); onPick(value); });
    box.append(b);
  });
}

segButtons("formatBtns", Object.fromEntries(Object.entries(FORMATS).map(([k, f]) => [k, f.label])), v => {
  if (v === state.format) return;
  state.format = v;
  reset();
});
segButtons("firstBtns", FIRST_PICK, v => {
  // Random re-rolls every time it's pressed; the others only reset if they change something
  if (v === state.first && v !== "random") return;
  state.first = v;
  reset();
});
segButtons("modeBtns", MODES, v => { state.mode = v; startTurn(); });

segButtons("roleBtns", Object.fromEntries(["All", ...ROLES].map(r => [r, r])), v => { state.role = v; renderPool(); });
document.querySelectorAll("#roleBtns button").forEach(b => { b.dataset.role = b.dataset.v; });

$("timerBtn").addEventListener("click", () => { state.timer = !state.timer; flash($("timerBtn"), "picked"); startTurn(); });
$("undoBtn").addEventListener("click", undo);
$("resetBtn").addEventListener("click", () => { flash($("resetBtn"), "picked"); reset(); });

$("search").addEventListener("input", e => { state.search = e.target.value; renderPool(); });
// Enter picks the hero when the search narrows it down to one
$("search").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const options = [...document.querySelectorAll(".hero:not(.hidden):not(:disabled)")];
  if (options.length === 1 && !isAITurn()) { options[0].click(); e.target.value = ""; state.search = ""; renderPool(); }
});

/* ---------- Hero grid (built once; render() only updates it) ---------- */

HEROES.forEach(hero => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hero";
  btn.dataset.name = hero.name;
  btn.dataset.role = hero.role;
  btn.title = `${hero.name} · ${hero.role}`;
  btn.append(makePortrait(hero));
  const name = document.createElement("span");
  name.className = "hname";
  name.textContent = hero.name;
  btn.append(name);
  btn.addEventListener("click", () => { if (!isAITurn()) choose(hero.name); });
  $("heroGrid").append(btn);
});

reset();
