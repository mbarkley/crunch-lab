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

## Deferred

This scaffold deliberately does **not** include a game-domain model, probability calculator, editable event forms, persistence, import/export, charts, accounts, or a backend. Those decisions will be made in later iterations.

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

Pushes to `main` run the GitHub Pages workflow. In the GitHub repository settings, choose **GitHub Actions** as the Pages source. The Vite base path is configured for a project site at `/crunch-lab/`.
