// Battle spell data. Edit cooldowns here when a patch changes them.
// `cd` is the base cooldown in seconds.
const SPELLS = [
  { name: "Execute",     cd: 90 },
  { name: "Retribution", cd: 35 },
  { name: "Inspire",     cd: 75 },
  { name: "Sprint",      cd: 100 },
  { name: "Revitalize",  cd: 100 },
  { name: "Aegis",       cd: 75 },
  { name: "Petrify",     cd: 75 },
  { name: "Purify",      cd: 90 },
  { name: "Flameshot",   cd: 50 },
  { name: "Flicker",     cd: 120 },
  { name: "Arrival",     cd: 75 },
  { name: "Vengeance",   cd: 75 },
];

// Spell selected when the page opens.
const DEFAULT_SPELL = "Flicker";

// Fallback symbols (24x24 SVG paths), shown only when a spell has no image
// in the icons/ folder (named like icons/flicker.webp).
const GLYPHS = {
  Execute:     '<path d="M5 19 19 5M15 5h4v4M7 13l4 4M4 20l2-2"/>',
  Retribution: '<path d="M6 4c0 8 4 12 12 16M10 4c0 6 3 9 9 11M14 4c0 4 2 6 6 7"/>',
  Inspire:     '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/>',
  Sprint:      '<path d="M3 8h10M5 12h12M3 16h10M15 6l6 6-6 6"/>',
  Revitalize:  '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 10v5M9.5 12.5h5"/>',
  Aegis:       '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
  Petrify:     '<path d="M12 3 4 9l3 11h10l3-11z"/><path d="M4 9h16M12 3l-3 6 3 11 3-11z"/>',
  Purify:      '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
  Flameshot:   '<path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-11 3 2 6 5 6 9 1-1 1.5-2 1.5-3 1 1.5 1.5 3 1.5 5 0 3-3 6-7 6z"/>',
  Flicker:     '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  Arrival:     '<ellipse cx="12" cy="18" rx="8" ry="3"/><path d="M12 3v11M8 10l4 4 4-4"/>',
  Vengeance:   '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/><circle cx="12" cy="12" r="2.5"/>',
};
