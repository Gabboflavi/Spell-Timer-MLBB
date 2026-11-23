// Winrate calculator. Loaded after ui.js.

const PRESETS = [50, 55, 60, 65, 70, 75, 80];

/* ---------- Formatting ---------- */

const fmtInt  = v => Number.isFinite(v) ? String(Math.round(v)) : "—";
const fmtPct  = v => Number.isFinite(v) ? `${(Math.round(v * 100) / 100).toFixed(2)}%` : "—";
const fmtDiff = v => Number.isFinite(v) ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%` : "—";
const fmtAfford = v => v === Infinity ? "∞" : fmtInt(v);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : /(s|sh|ch|x)$/.test(word) ? "es" : "s"}`;

/* ---------- Calculation ---------- */

// Wins you have now (win rates in MLBB are rounded, so this is the closest whole number)
function currentWins(matches, ratePct) {
  return Math.min(matches, Math.max(0, Math.round(matches * ratePct / 100)));
}

// Wins in a row needed to reach the target (Infinity if it can't be reached)
function winsNeeded(wins, matches, targetPct) {
  const t = targetPct / 100;
  if (matches > 0 && wins / matches >= t) return 0;
  if (matches === 0 && t <= 1) return t > 0 ? 1 : 0;
  if (t >= 1) return Infinity; // 100% is impossible once you've lost a game
  return Math.max(0, Math.ceil((t * matches - wins) / (1 - t) - 1e-9));
}

// Losses in a row you can take and still be at or above the target
function lossesAffordable(wins, matches, targetPct) {
  const t = targetPct / 100;
  if (matches === 0 || wins / matches < t) return 0;
  if (t <= 0) return Infinity;
  return Math.max(0, Math.floor(wins / t - matches + 1e-9));
}

/* ---------- Rendering ---------- */

function render() {
  const matches = Math.max(0, Math.round(num("matches")));
  const rate = Math.min(100, Math.max(0, num("current")));
  const target = Math.min(100, Math.max(0, num("target")));
  const wins = currentWins(matches, rate);
  const actual = matches ? wins / matches * 100 : 0;

  // Target
  const need = winsNeeded(wins, matches, target);
  const afford = lossesAffordable(wins, matches, target);
  animateValue("outWins", wins, fmtInt);
  animateValue("outNeed", need, fmtInt);
  animateValue("outAfford", afford, fmtAfford);
  $("needLabel").textContent = need === 0 ? "Already there" : "Wins needed";

  $("needText").textContent =
    need === Infinity ? `You can't reach ${target}% once you've lost a match.`
    : need === 0      ? `You're at ${fmtPct(actual)}, already at or above ${target}%. You can lose ${afford === Infinity ? "any number of" : plural(afford, "match")} in a row and stay there.`
    :                   `Win ${plural(need, "match")} in a row to go from ${fmtPct(actual)} to ${target}% (${wins + need} wins out of ${matches + need}).`;

  $("barCurrent").style.width = `${actual}%`;
  $("barTarget").style.left = `${target}%`;

  // What if
  const addW = Math.max(0, Math.round(num("addWins")));
  const addL = Math.max(0, Math.round(num("addLosses")));
  const newMatches = matches + addW + addL;
  const newRate = newMatches ? (wins + addW) / newMatches * 100 : NaN;
  const change = matches ? newRate - actual : NaN;

  animateValue("outMatches", newMatches, fmtInt);
  animateValue("outNewRate", newRate, fmtPct);
  animateValue("outChange", change, fmtDiff);
  $("outChange").classList.toggle("up", change > 0.005);
  $("outChange").classList.toggle("down", change < -0.005);
  $("whatIfText").textContent = newMatches
    ? `${wins + addW} wins out of ${newMatches} matches.`
    : "Add some matches to see a win rate.";

  // Highlight the preset that matches the target
  $("presets").querySelectorAll("button").forEach(btn =>
    btn.setAttribute("aria-pressed", +btn.dataset.v === target));
}

/* ---------- Startup ---------- */

PRESETS.forEach(v => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tog";
  btn.textContent = `${v}%`;
  btn.dataset.v = v;
  btn.addEventListener("click", () => { flash(btn, "picked"); setInput($("target"), v); });
  $("presets").appendChild(btn);
});

["matches", "current", "target", "addWins", "addLosses"]
  .forEach(id => $(id).addEventListener("input", render));

setupSteppers();
render();
