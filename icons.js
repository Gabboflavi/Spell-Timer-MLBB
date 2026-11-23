// Spell icon loading, shared by every page. Needs spells.js loaded first.
//
// Order tried for each spell:
//   1. an icon dropped onto a spell button (saved in this browser)
//   2. icons/<spell>.<webp|png|jpg|jpeg|gif>
//   3. the fallback glyph from spells.js

const store = {
  get: k => { try { return localStorage.getItem("icon:" + k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem("icon:" + k, v); return true; } catch { return false; } },
  del: k => { try { localStorage.removeItem("icon:" + k); } catch {} },
};

// HTML for the fallback glyph
function glyphSvg(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[name] || ""}</svg>`;
}

// Put an image inside el's .icon once it loads
function showImg(el, src, onFail) {
  const img = new Image();
  img.alt = "";
  img.onload = () => el.querySelector(".icon").replaceChildren(img);
  img.onerror = onFail || (() => {});
  img.src = src;
}

// Show the best available icon for a spell inside el's .icon
function loadIcon(sp, el) {
  el.querySelector(".icon").innerHTML = glyphSvg(sp.name);
  const saved = store.get(sp.name);
  if (saved) return showImg(el, saved);
  const exts = ["webp", "png", "jpg", "jpeg", "gif"];
  const tryNext = i => i < exts.length &&
    showImg(el, `icons/${sp.name.toLowerCase()}.${exts[i]}`, () => tryNext(i + 1));
  tryNext(0);
}
