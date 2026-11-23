// Homepage. Loaded after spells.js and icons.js.

// Default PYT values (keep in sync with the defaults in calculator.html)
const PYT = { base: 12, perStack: 1, maxStacks: 8 };

// Seconds -> "m:ss"
function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round((secs - m * 60) * 10) / 10;
  return `${m}:${Number.isInteger(s) ? String(s).padStart(2, "0") : s.toFixed(1).padStart(4, "0")}`;
}

// Spell cards: base cooldown, and the lowest it can go with full PYT stacks
const maxCut = PYT.base + PYT.perStack * PYT.maxStacks;
const grid = document.getElementById("spellGrid");

SPELLS.forEach((sp, i) => {
  const card = document.createElement("a");
  card.className = "spell-card";
  card.href = `calculator.html?spell=${encodeURIComponent(sp.name)}`;
  card.style.animationDelay = `${0.2 + i * 0.04}s`;
  const best = Math.round(sp.cd * (1 - maxCut / 100) * 10) / 10;
  card.innerHTML = `<span class="icon"></span>`
                 + `<span class="name">${sp.name}</span>`
                 + `<span class="cd">${fmt(sp.cd)} → <b>${fmt(best)}</b></span>`;
  card.title = `${sp.name}: ${sp.cd}s base, ${best}s with full PYT stacks`;
  loadIcon(sp, card);
  grid.appendChild(card);
});

// PYT numbers in the note
document.getElementById("pytBaseText").textContent = `${PYT.base}%`;
document.getElementById("pytStackText").textContent = `${PYT.perStack}%`;
document.getElementById("pytMaxText").textContent = PYT.maxStacks;
document.getElementById("pytTotalText").textContent = `${maxCut}%`;
