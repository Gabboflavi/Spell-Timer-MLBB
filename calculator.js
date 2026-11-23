// Cooldown calculator. Loaded after spells.js, icons.js and ui.js.

// calculator.html?spell=Aegis opens with that spell picked (used by the homepage)
const linkedSpell = new URLSearchParams(location.search).get("spell");
const state = {
  spell: SPELLS.find(s => s.name.toLowerCase() === (linkedSpell || "").toLowerCase())
      || SPELLS.find(s => s.name === DEFAULT_SPELL),
  pyt: false,
  kills: 0,
};

// Seconds -> "m:ss" (keeps one decimal when needed, e.g. 1:39.6)
function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs - m * 60;
  const sStr = Number.isInteger(s) ? String(s).padStart(2, "0")
                                   : s.toFixed(1).padStart(4, "0");
  return `${m}:${sStr}`;
}

/* ---------- Icon drag-and-drop ----------
   Loading icons is in icons.js (shared with the homepage). */

function dropIcon(e, sp, btn) {
  const file = [...e.dataTransfer.files].find(f => f.type.startsWith("image/"));
  if (file) {
    const r = new FileReader();
    r.onload = () => { showImg(btn, r.result); store.set(sp.name, r.result); };
    r.readAsDataURL(file);
    return;
  }
  let url = e.dataTransfer.getData("text/uri-list").split("\n")[0].trim();
  if (!url) {
    const html = e.dataTransfer.getData("text/html");
    const m = html && html.match(/<img[^>]+src="([^"]+)"/i);
    url = m ? m[1] : e.dataTransfer.getData("text/plain").trim();
  }
  if (/^(https?:|data:image\/)/i.test(url)) {
    showImg(btn, url, () => alert("That image couldn't be loaded. Try saving it and dropping the file instead."));
    store.set(sp.name, url);
  }
}

/* ---------- Building the buttons ---------- */

function buildSpells() {
  SPELLS.forEach((sp, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tog";
    btn.innerHTML = `<span class="icon"></span>`
                  + `<span class="spell-name">${sp.name}</span><span class="spell-cd">${sp.cd}s</span>`;
    loadIcon(sp, btn);

    // Stagger the pop-in, then clear the delay so it doesn't affect later animations
    btn.style.animationDelay = `${0.15 + i * 0.04}s`;
    setTimeout(() => { btn.style.animationDelay = ""; }, 1000);

    btn.addEventListener("click", () => {
      state.spell = sp;
      setInput($("baseCd"), sp.cd);
      flash(btn, "picked");
      render();
    });
    btn.addEventListener("dragover", e => { e.preventDefault(); btn.classList.add("drop"); });
    btn.addEventListener("dragleave", () => btn.classList.remove("drop"));
    btn.addEventListener("drop", e => { e.preventDefault(); btn.classList.remove("drop"); dropIcon(e, sp, btn); });
    btn.addEventListener("contextmenu", e => {
      if (!store.get(sp.name)) return;
      e.preventDefault();
      if (confirm(`Remove the custom icon for ${sp.name}?`)) { store.del(sp.name); loadIcon(sp, btn); }
    });

    sp.btn = btn;
    $("spells").appendChild(btn);
  });
}

// Kill/assist buttons, 0..max stacks (rebuilt when max stacks changes)
function buildKills() {
  const max = Math.max(0, Math.round(num("pytMax", 8)));
  state.kills = Math.min(state.kills, max);
  $("kills").innerHTML = "";
  for (let i = 0; i <= max; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tog";
    btn.textContent = i === max && max > 0 ? `${i}+` : i;
    btn.dataset.k = i;
    btn.addEventListener("click", () => { state.kills = i; flash(btn, "picked"); render(); });
    $("kills").appendChild(btn);
  }
}

/* ---------- Calculation ---------- */

function calculate() {
  const base = Math.max(0, num("baseCd", state.spell.cd));
  const reduction = state.pyt
    ? Math.min(100, num("pytBase") + num("pytStack") * state.kills)
    : 0;
  const cd = Math.round(base * (1 - reduction / 100) * 10) / 10;

  const usedAt = Math.max(0, Math.floor(num("useMin"))) * 60
               + Math.min(59, Math.max(0, Math.floor(num("useSec"))));
  // Rounded up so it never shows the spell as ready too early
  const readyAt = Math.ceil(usedAt + cd);

  return { base, reduction, cd, usedAt, readyAt };
}

/* ---------- Rendering ---------- */

function render() {
  SPELLS.forEach(sp => sp.btn.setAttribute("aria-pressed", sp === state.spell));

  $("pyt").setAttribute("aria-pressed", state.pyt);
  $("pyt").textContent = state.pyt ? "PYT: On" : "PYT: Off";
  $("kills").querySelectorAll("button").forEach(btn => {
    btn.disabled = !state.pyt;
    btn.setAttribute("aria-pressed", state.pyt && +btn.dataset.k === state.kills);
  });
  $("killHint").style.display = state.pyt ? "none" : "";

  const { base, reduction, cd, usedAt, readyAt } = calculate();
  animateValue("outCd", cd, fmt);
  animateValue("outUsed", usedAt, fmt);
  animateValue("outReady", readyAt, fmt);
  $("breakdown").textContent = state.pyt
    ? `${state.spell.name}: ${base}s − ${+reduction.toFixed(1)}% (PYT ${num("pytBase")}% + ${state.kills} × ${num("pytStack")}%) = ${cd}s`
    : `${state.spell.name}: ${base}s, no reduction`;
}

/* ---------- Events & startup ---------- */

$("pyt").addEventListener("click", () => { state.pyt = !state.pyt; flash($("pyt"), "picked"); render(); });
$("resetCd").addEventListener("click", () => { setInput($("baseCd"), state.spell.cd); render(); });
["baseCd", "useMin", "useSec", "pytBase", "pytStack"].forEach(id => $(id).addEventListener("input", render));
$("pytMax").addEventListener("input", () => { buildKills(); render(); });

buildSpells();
buildKills();
$("baseCd").value = state.spell.cd;
setupSteppers();
render();
