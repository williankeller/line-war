# Contributing

Thanks for helping out. Line War is a small project with no build step, so getting started takes a minute.

## Setup

```sh
git clone https://github.com/williankeller/line-war.git
cd line-war
python3 -m http.server 8000
```

Open http://localhost:8000 and reload after each change.

## Reporting bugs

Open an issue and include:

- What you did and what you expected
- What happened instead
- Browser and device
- A screenshot or screen recording if it is visual

## Suggesting features

Open an issue describing the idea and why it would make the game better. For bigger changes, please discuss before writing code so we can agree on the approach.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep each pull request focused on one change.
3. Test in at least one Chromium browser and one of Firefox or Safari.
4. Check the layout at phone width (about 400px).
5. Describe what changed and why. Add a screenshot or GIF for visual changes.

## Code style

- Plain HTML, CSS and JavaScript. No frameworks and no build tools.
- ES modules, two-space indentation, semicolons, single quotes in JS.
- Keep `js/game.js` free of DOM code. Report events through callbacks instead.
- Put tunable numbers in `js/config.js` or as named constants at the top of a module.
- Use clear names over comments. Add a comment when the reason for something is not obvious.

## Code of conduct

Be respectful. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
