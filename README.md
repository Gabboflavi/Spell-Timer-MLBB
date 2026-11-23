# Spell Timer

A small fan-made toolkit for **Mobile Legends: Bang Bang**: a battle spell cooldown calculator, a winrate calculator and a draft simulator with post-draft analysis.

It's plain HTML, CSS and JavaScript. There's no build step, no framework and nothing to install.

## Pages

### Home (`index.html`)
Links to every tool, plus a grid of all battle spells showing each base cooldown and the lowest it can go with Pull Yourself Together. Tapping a spell opens the cooldown calculator with that spell already picked.

### Cooldown calculator (`calculator.html`)
Works out when an enemy's battle spell is back, on the game clock.

- Pick one of the 12 battle spells. Its base cooldown fills in and can be edited if a patch changes it.
- Turn **Pull Yourself Together** on or off and set kills + assists (0–8).
- Enter the game time the spell was used (minutes : seconds).
- See the cooldown, when it was used and when it's **ready again**. Ready times round up so a spell is never shown as ready too early.
- The PYT values (12% base, +1% per kill/assist, 8 stacks max) can be edited on the page.
- Drag an image onto a spell button to change its icon (saved in your browser).

### Winrate calculator (`winrate.html`)
- Enter total matches and current win rate, then a target (or tap a quick target from 50–80%).
- See how many **wins in a row** you need, or how many losses you can afford if you're already above it.
- **What if…**: add wins and losses to see your new win rate and how much it changes.

### Draft simulator (`draft.html`)
- **Tournament** or **Ranked** ban/pick order.
  - Tournament: 3 bans each (alternating), picks 1-2-2-1, 2 more bans each, picks 1-2-1.
  - Ranked: Blue bans 3, Red bans 3, Blue bans 2, Red bans 2, then picks 1-2-2-2-2-1.
- **First pick**: Blue, Red or Random. Bans always start with Blue.
- **Opponent**: draft both sides yourself, or play Blue or Red against a computer that bans randomly and picks to fill missing roles.
- Optional **30-second turn timer**. When time runs out a ban is skipped and a pick goes to a random hero.
- Search heroes by name, filter by role, and press Enter to pick when the search narrows to one hero. Undo and Reset are available at any time.
- Set a **lane** (EXP, Jungle, Mid, Gold, Roam) for each picked hero, or leave it on Auto to use the suggested lane.
- **Post-draft analysis**: a rating per team, a verdict, scores for lanes, crowd control, damage mix and frontline, the physical/magic split, lanes, strengths, weaknesses and tips against the other team.

> The analysis is a rough estimate based on hero roles and a few simple traits. It isn't real match data and doesn't know specific counters.

## Running it

Open `index.html` in any modern browser. That's it.

To host it for free, push the repository to GitHub, then go to **Settings → Pages**, choose **Deploy from a branch**, select your main branch and the root folder, and save. The site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Project structure

```
index.html, home.css, home.js                 Homepage
calculator.html, calculator.css, calculator.js Cooldown calculator
winrate.html, winrate.css, winrate.js          Winrate calculator
draft.html, draft.css, draft.js                Draft simulator
analysis.js                                    Post-draft analysis logic

base.css      Shared styles: colors, navbar, buttons, number boxes, result panels, animations
ui.js         Shared helpers: −/+ number steppers, value animations
icons.js      Loads battle spell icons
spells.js     Battle spell list and base cooldowns
heroes.js     Hero roster by role, plus traits used by the analysis

icons/        Battle spell icons (e.g. icons/flicker.webp)
heroes/       Hero portraits (e.g. heroes/yi-sun-shin.webp)
```

## Keeping it up to date

| To change… | Edit |
|---|---|
| A battle spell's base cooldown | `spells.js` |
| Default PYT values | `calculator.html` (the PYT inputs) and the `PYT` object at the top of `home.js` |
| Add a new hero | Add the name to its role list in `HERO_ROLES` in `heroes.js` |
| Which heroes count as magic damage, heavy crowd control or late game | `HERO_TRAITS` in `heroes.js` |
| Draft orders | `FORMATS` at the top of `draft.js` |
| How the analysis scores teams | `analysis.js` |

### Adding images

- **Spell icons**: save them in `icons/` named after the spell in lowercase, e.g. `icons/flicker.webp`. `.webp`, `.png`, `.jpg`, `.jpeg` and `.gif` all work.
- **Hero portraits**: save them in `heroes/` named after the hero in lowercase, with dashes for spaces and punctuation, e.g. `heroes/gusion.webp`, `heroes/yi-sun-shin.webp`, `heroes/chang-e.webp`, `heroes/x-borg.webp`. `.webp`, `.png` and `.jpg` all work. The page finds them automatically.

Anything without an image falls back to a simple symbol (spells) or colored initials (heroes).

## License

The code in this repository is released under the [MIT License](LICENSE).

The license covers the original code only. The images in `icons/` and `heroes/`, and all Mobile Legends: Bang Bang names and artwork, belong to Moonton and are **not** covered by it.

## Disclaimer

This is an unofficial fan project and is not affiliated with or endorsed by Moonton. Mobile Legends: Bang Bang, its hero and battle spell names, and any game artwork belong to Moonton. Cooldowns, talent values and the hero list may be out of date after a patch, so check them in-game.
