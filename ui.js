// Shared UI helpers for every page: animations and the −/+ number steppers.

const $ = id => document.getElementById(id);

// Read a number input, falling back if it's empty or invalid
function num(id, fallback = 0) {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) ? v : fallback;
}

/* ---------- Animation helpers ---------- */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Restart a one-shot CSS animation class on an element
function flash(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the animation plays again
  el.classList.add(cls);
  el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
}

// Smoothly count a result display from its last value to a new one.
// `format` turns the number into text (e.g. seconds -> "1:30").
const shown = {}; // id -> value currently displayed
function animateValue(id, target, format = String) {
  const el = $(id);
  const from = shown[id];
  shown[id] = target;
  const canTween = Number.isFinite(from) && Number.isFinite(target);
  if (from === target) return;
  if (!canTween || reduceMotion) {
    el.textContent = format(target);
    if (from !== undefined) flash(el, "bump");
    return;
  }
  flash(el, "bump");
  const start = performance.now(), dur = 350;
  const step = now => {
    if (shown[id] !== target) return; // a newer change took over
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = from + (target - from) * eased;
    el.textContent = format(t < 1 ? Math.round(v * 10) / 10 : target);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Browsers pause animation frames in hidden tabs; make sure the final value always lands
  setTimeout(() => { if (shown[id] === target) el.textContent = format(target); }, dur + 50);
}

/* ---------- Number steppers ----------
   Wraps every <input type="number"> in a box with −/+ buttons.
   Hold a button to keep stepping.

   Roll-over (like game-clock seconds into minutes): give the input
     data-rollover-into="<id of the bigger unit>"  data-rollover-at="59"
   so 0:59 + 1 → 1:00 and 1:00 − 1 → 0:59. */

function setupSteppers() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    // Point the surrounding label at the input (not the − button)
    const label = input.closest("label");
    if (label && !label.htmlFor) label.htmlFor = input.id;

    const box = document.createElement("div");
    box.className = "stepper";
    const clip = document.createElement("span");
    clip.className = "num-clip";
    const name = input.getAttribute("aria-label") || (label ? label.firstChild.textContent.trim() : "value");
    const minus = makeStepButton("−", `Decrease ${name}`, () => stepInput(input, -1));
    const plus  = makeStepButton("+", `Increase ${name}`, () => stepInput(input, +1));

    input.before(box);
    clip.append(input);
    box.append(minus, clip, plus);
    input.stepButtons = { minus, plus };

    // Animate whenever the value changes, whether typed or stepped
    input.dataset.prev = input.value;
    input.addEventListener("input", () => {
      const prev = parseFloat(input.dataset.prev), now = parseFloat(input.value);
      if (Number.isFinite(prev) && Number.isFinite(now) && now !== prev) {
        input.classList.remove("roll-up", "roll-down");
        flash(input, now > prev ? "roll-up" : "roll-down");
        flash(box, "changed");
      }
      input.dataset.prev = input.value;
      updateStepButtons(input);
    });

    // A rollover input's − button depends on the bigger unit's value
    const bigger = rolloverTarget(input);
    if (bigger) bigger.addEventListener("input", () => updateStepButtons(input));

    updateStepButtons(input);
  });
}

function rolloverTarget(input) {
  return input.dataset.rolloverInto ? $(input.dataset.rolloverInto) : null;
}

function makeStepButton(text, label, onStep) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "step";
  btn.textContent = text;
  btn.setAttribute("aria-label", label);

  // Press and hold: one step now, then repeat faster after a short pause
  let wait, repeat;
  const stop = () => { clearTimeout(wait); clearInterval(repeat); };
  btn.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault(); // keep focus where it was
    onStep();
    wait = setTimeout(() => { repeat = setInterval(onStep, 70); }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
  // Keyboard (Enter/Space) fires click with detail 0
  btn.addEventListener("click", e => { if (e.detail === 0) onStep(); });
  return btn;
}

function stepInput(input, dir) {
  const step = parseFloat(input.step) || 1;
  const min = input.min === "" ? -Infinity : parseFloat(input.min);
  const max = input.max === "" ? Infinity : parseFloat(input.max);
  let v = (parseFloat(input.value) || 0) + dir * step;

  const bigger = rolloverTarget(input);
  if (bigger) {
    const top = parseFloat(input.dataset.rolloverAt);
    const big = parseFloat(bigger.value) || 0;
    if (v > top) { v = 0; setInput(bigger, big + 1); }
    else if (v < 0) {
      if (big > 0) { v = top; setInput(bigger, big - 1); }
      else v = 0;
    }
  }

  v = Math.min(max, Math.max(min, v));
  v = Math.round(v * 100) / 100;
  setInput(input, v);
}

// Set an input's value and let everything listening know it changed
function setInput(input, value) {
  if (String(value) === input.value) return;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function updateStepButtons(input) {
  if (!input.stepButtons) return;
  const v = parseFloat(input.value) || 0;
  const atMin = input.min !== "" && v <= parseFloat(input.min);
  const atMax = input.max !== "" && v >= parseFloat(input.max);
  const bigger = rolloverTarget(input);
  const canBorrow = bigger && (parseFloat(bigger.value) || 0) > 0;
  input.stepButtons.minus.disabled = atMin && !canBorrow;
  input.stepButtons.plus.disabled = atMax && !bigger;
}
