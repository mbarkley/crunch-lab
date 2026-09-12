# Crunch Lab

Crunch Lab is a visual, browser-based workbench for modeling probabilities of dice-driven game events. It is intended for questions such as: _What is the expected damage when a D&D character makes five attacks, where a hit applies Vex and gives advantage on the next attack?_

## Requirements

- Run entirely in the browser and compile to static files suitable for GitHub Pages.
- Use TypeScript.
- Provide a visual editor for chains of game events.
- Start from random variables such as a `1d20` roll and route outcomes into later events.
- Represent state created by earlier events when it changes later events.

## Decisions so far

- **Name:** Crunch Lab.
- **Stack:** React, TypeScript, Vite, npm, and custom CSS.
- **Hosting:** GitHub Pages; Vite builds static assets into `dist`.
- **Editor direction:** a guided sequence, not a free-form node canvas. Each attack will receive a visible enemy state, select the relevant roll path, and visibly pass hit/miss state to the next attack.
- **Reference design:** [guided-sequence-mockup.html](design/guided-sequence-mockup.html). It is a static, nonfunctional design reference.

## Working now

The first functional editor models a sequence of independent attacks. Each attack configures a raw d20 threshold and damage as a dice count, common die size, and modifier. The interface reports hit chance, expected damage per attack, and total expected damage as values change.

## Deferred

State passed between attacks, advantage and disadvantage, critical hits, persistence, import/export, full probability charts, accounts, and a backend remain deferred.

## Development

Requires Node 24 and npm.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run lint
npm test
npm run build
npm run format:check
```

## Deployment

GitHub Pages deployment is temporarily disabled. The Vite base path remains configured for a project site at `/crunch-lab/` for when deployment is restored.
