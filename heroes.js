// Hero roster for the draft simulator, grouped by main role.
// Add new heroes to the right list when they're released.

const HERO_ROLES = {
  Tank: [
    "Tigreal", "Akai", "Franco", "Minotaur", "Lolita", "Johnson", "Hylos", "Grock",
    "Uranus", "Belerick", "Khufra", "Gatotkaca", "Baxia", "Atlas", "Barats",
    "Edith", "Gloo", "Chip",
  ],
  Fighter: [
    "Balmond", "Alucard", "Bane", "Zilong", "Freya", "Alpha", "Ruby", "Sun", "Chou",
    "Lapu-Lapu", "Roger", "Argus", "Jawhead", "Martis", "Aldous", "Leomord", "Hilda",
    "Thamuz", "Minsitthar", "Badang", "Guinevere", "Terizla", "X.Borg", "Dyrroth",
    "Masha", "Silvanna", "Yu Zhong", "Khaleed", "Paquito", "Phoveus", "Aulus", "Yin",
    "Fredrinn", "Julian", "Arlott", "Cici", "Lukas", "Sora",
  ],
  Assassin: [
    "Saber", "Karina", "Fanny", "Hayabusa", "Natalia", "Lancelot", "Helcurt", "Gusion",
    "Hanzo", "Ling", "Benedetta", "Aamon", "Joy", "Nolan", "Selena", "Harley",
    "Yi Sun-shin", "Suyou", "Hirara",
  ],
  Mage: [
    "Nana", "Eudora", "Gord", "Kagura", "Cyclops", "Aurora", "Vexana", "Alice",
    "Harith", "Zhask", "Pharsa", "Valir", "Chang'e", "Lunox", "Esmeralda", "Kadita",
    "Lylia", "Cecilion", "Luo Yi", "Yve", "Valentina", "Xavier", "Novaria", "Zhuxin",
    "Vale", "Odette", "Zetian",
  ],
  Marksman: [
    "Miya", "Bruno", "Clint", "Layla", "Moskov", "Karrie", "Irithel", "Hanabi",
    "Lesley", "Claude", "Kimmy", "Granger", "Wanwan", "Popol and Kupa", "Brody",
    "Beatrix", "Natan", "Melissa", "Ixia", "Obsidia",
  ],
  Support: [
    "Rafaela", "Estes", "Angela", "Diggie", "Kaja", "Faramis", "Mathilda", "Floryn",
    "Carmilla", "Kalea", "Marcel",
  ],
};

// Extra traits used by the post-draft analysis. Approximate: edit freely.
const HERO_TRAITS = {
  // Non-mage heroes whose damage is mostly magic (every Mage counts as magic already)
  magic: [
    "Karina", "Harley", "Selena", "Gusion", "Joy", "Aamon", "Guinevere", "Silvanna",
    "Phoveus", "Kimmy", "Gatotkaca", "Johnson", "Uranus", "Belerick", "Baxia", "Hylos",
    "Atlas", "Gloo", "Kaja", "Faramis", "Mathilda", "Rafaela", "Estes", "Angela",
    "Diggie", "Floryn", "Carmilla",
  ],
  // Heroes with strong crowd control (stuns, knock-ups, suppression, big slows)
  heavyCC: [
    "Tigreal", "Atlas", "Khufra", "Franco", "Lolita", "Minotaur", "Gatotkaca", "Kaja",
    "Chou", "Aurora", "Vale", "Eudora", "Johnson", "Akai", "Grock", "Barats", "Edith",
    "Gloo", "Carmilla", "Belerick", "Hylos", "Luo Yi", "Valir", "Yve", "Selena", "Kadita",
  ],
  // Heroes who get much stronger late in the game
  late: ["Aldous", "Cecilion", "Alice"],
};

// Flat list: [{ name, role, slug }]
const HEROES = Object.entries(HERO_ROLES).flatMap(([role, names]) =>
  names.map(name => ({
    name,
    role,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  }))
).sort((a, b) => a.name.localeCompare(b.name));

// Hero pictures: just drop them in the heroes/ folder, named after the hero in
// lowercase with dashes (e.g. heroes/gusion.webp, heroes/yi-sun-shin.png,
// heroes/chang-e.jpg). The draft looks for every hero automatically, trying
// these file types in order. Heroes without a picture show colored initials.
const HERO_IMAGE_EXTS = ["webp", "png", "jpg"];
