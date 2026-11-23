// Post-draft analysis. Loaded after heroes.js; used by draft.js.
// Everything here is a rough estimate from hero roles and the traits in heroes.js,
// not real match data.

const LANES = ["EXP", "Jungle", "Mid", "Gold", "Roam"];

// How well each role fits each lane (3 = natural fit, 0 = doesn't fit)
const LANE_FIT = {
  EXP:    { Fighter: 3, Tank: 2 },
  Jungle: { Assassin: 3, Fighter: 2, Tank: 1 },
  Mid:    { Mage: 3, Support: 1 },
  Gold:   { Marksman: 3, Fighter: 1, Mage: 1 },
  Roam:   { Tank: 3, Support: 3, Fighter: 1, Mage: 1 },
};

// How much of a team's damage each role usually provides
const DAMAGE_WEIGHT = { Marksman: 1, Mage: 1, Assassin: 1, Fighter: .8, Tank: .3, Support: .3 };

const magicSet = new Set(HERO_TRAITS.magic);
const ccSet = new Set(HERO_TRAITS.heavyCC);
const lateSet = new Set(HERO_TRAITS.late);

const isMagic = h => h.role === "Mage" || magicSet.has(h.name);
const pct = x => Math.round(x * 100);
const clamp01 = x => Math.max(0, Math.min(1, x));

/* ---------- Lanes ---------- */

const laneFit = (lane, hero) => LANE_FIT[lane][hero.role] || 0;

// Give each hero its own lane, keeping the lanes in `fixed` (hero name -> lane)
// and choosing the best-fitting lanes for everyone else. Works with 1–5 heroes.
function assignLanes(heroes, fixed = {}) {
  let best = { total: -1, pairs: [] };
  const search = (i, used, pairs, total) => {
    if (i === heroes.length) {
      if (total > best.total) best = { total, pairs };
      return;
    }
    const hero = heroes[i];
    const options = fixed[hero.name] && !used.has(fixed[hero.name]) ? [fixed[hero.name]] : LANES.filter(l => !used.has(l));
    options.forEach(lane =>
      search(i + 1, new Set([...used, lane]), [...pairs, { lane, hero }], total + laneFit(lane, hero)));
  };
  // Heroes with a chosen lane claim it first
  const ordered = [...heroes].sort((a, b) => (fixed[b.name] ? 1 : 0) - (fixed[a.name] ? 1 : 0));
  heroes = ordered;
  search(0, new Set(), [], 0);
  return {
    score: heroes.length ? best.total / (3 * heroes.length) : 0,
    lanes: best.pairs
      .map(({ lane, hero }) => ({ lane, hero, fit: laneFit(lane, hero), chosen: fixed[hero.name] === lane }))
      .sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane)),
  };
}

/* ---------- One team ---------- */

function analyzeTeam(heroes, fixedLanes = {}) {
  const count = role => heroes.filter(h => h.role === role).length;
  const lanes = assignLanes(heroes, fixedLanes);

  // Crowd control
  const ccHeroes = heroes.filter(h => ccSet.has(h.name));
  const ccPoints = heroes.reduce((sum, h) =>
    sum + (ccSet.has(h.name) ? 2 : (h.role === "Tank" || h.role === "Support" || h.role === "Mage") ? .75 : .25), 0);
  const cc = clamp01(ccPoints / 6);

  // Damage split
  let phys = 0, mag = 0;
  heroes.forEach(h => { const w = DAMAGE_WEIGHT[h.role]; if (isMagic(h)) mag += w; else phys += w; });
  const magicShare = mag / (phys + mag || 1);
  const dmgBalance = magicShare >= .3 && magicShare <= .65 ? 1
                   : clamp01(1 - (magicShare < .3 ? .3 - magicShare : magicShare - .65) * 2.4);

  // Frontline
  const tanks = count("Tank"), fighters = count("Fighter"), supports = count("Support");
  const front = tanks >= 1 ? 1 : (fighters >= 2 || (fighters >= 1 && supports >= 1)) ? .6 : .2;

  // Power curve
  let early = 0, late = 0;
  heroes.forEach(h => {
    if (h.role === "Assassin") early += 1;
    if (h.role === "Fighter" || h.role === "Tank" || h.role === "Support") early += .4;
    if (h.role === "Marksman") late += 1.2;
    if (h.role === "Mage") late += .4;
    if (lateSet.has(h.name)) late += 1;
  });
  const curve = early - late > .8 ? "Early game" : late - early > .8 ? "Late game" : "Balanced";

  const scores = {
    lanes: pct(lanes.score),
    cc: pct(cc),
    damage: pct(dmgBalance),
    frontline: pct(front),
  };
  const overall = Math.round(scores.lanes * .35 + scores.cc * .25 + scores.damage * .2 + scores.frontline * .2);

  // Strengths and weaknesses
  const good = [], bad = [];
  if (scores.lanes >= 85) good.push("Every lane has a natural pick.");
  lanes.lanes.filter(l => l.fit === 0).forEach(l => bad.push(`${l.hero.name} is out of place in ${l.lane} lane.`));
  if (ccHeroes.length >= 3) good.push(`Lots of crowd control (${ccHeroes.map(h => h.name).join(", ")}).`);
  else if (ccHeroes.length === 0) bad.push("Little hard crowd control to lock enemies down.");
  if (magicShare > .75) bad.push("Damage is almost all magic, so magic defense shuts it down.");
  else if (magicShare < .2) bad.push("Damage is almost all physical, so physical defense shuts it down.");
  else good.push("Good mix of physical and magic damage.");
  if (tanks === 0) bad.push(front >= .6 ? "No tank; fighters will have to hold the front." : "No frontline to start fights or protect carries.");
  if (tanks >= 2) good.push("Very tanky frontline.");
  if (count("Marksman") === 0 && count("Mage") === 0) bad.push("No marksman or mage for steady ranged damage.");
  const mm = count("Marksman");
  if (mm >= 2) bad.push(`${mm === 2 ? "Two" : mm} marksmen: strong late, but fragile early.`);
  if (count("Assassin") >= 2) good.push("Several assassins to pick off carries.");

  return { heroes, lanes, magicShare, curve, ccHeroes, scores, overall, good, bad };
}

/* ---------- Both teams ---------- */

// blueLanes / redLanes: lanes you chose in the draft (hero name -> lane)
function analyzeDraft(blueHeroes, redHeroes, blueLanes = {}, redLanes = {}) {
  const blue = analyzeTeam(blueHeroes, blueLanes);
  const red = analyzeTeam(redHeroes, redLanes);
  const diff = blue.overall - red.overall;
  const verdict = Math.abs(diff) <= 4 ? { team: null, text: "Even draft. It'll come down to how it's played." }
                : diff > 0 ? { team: "blue", text: `Blue has the stronger draft on paper (+${diff}).` }
                           : { team: "red", text: `Red has the stronger draft on paper (+${-diff}).` };
  blue.tips = matchupTips(blue, red);
  red.tips = matchupTips(red, blue);
  return { blue, red, verdict };
}

// Advice for `us` against `them`
function matchupTips(us, them) {
  const tips = [];
  if (them.magicShare > .65) tips.push("Their damage is mostly magic, so magic defense items go further.");
  else if (them.magicShare < .3) tips.push("Their damage is mostly physical, so physical defense items go further.");
  if (them.ccHeroes.length >= 3) tips.push("They have heavy crowd control. Purify on a carry is worth considering.");
  if (them.heroes.filter(h => h.role === "Assassin").length >= 2) tips.push("Their assassins will dive your backline. Aegis or Flicker helps carries survive.");
  if (us.curve === "Early game" && them.curve !== "Early game") tips.push("You peak early. Take objectives fast and end before they scale.");
  if (us.curve === "Late game" && them.curve === "Early game") tips.push("They peak early. Play safe, farm, and win the late game.");
  if (!them.heroes.some(h => h.role === "Tank")) tips.push("They have no tank. Fight around objectives where your frontline wins.");
  if (!tips.length) tips.push("No big weaknesses to exploit. Play to your own strengths.");
  return tips;
}
