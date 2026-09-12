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

The functional editor models a sequence of independent player and enemy events. Attacks configure a target armor class, attack modifier, and damage roll. Attack rolls follow the natural 1 miss and natural 20 hit rules.

Player and enemy saving throws configure a save DC, save modifier, damage roll, and the damage taken on failure or success. A consequence can apply full damage, half damage rounded down, or no damage.

Every event produces a typed outcome. The summary groups expected damage against enemies separately from expected damage against players and updates as the sequence changes.

## Deferred

State passed between events, advantage and disadvantage, critical-hit damage, persistence, import/export, full probability charts, accounts, and a backend remain deferred.

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
