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

The functional editor models combat as nested rounds, player or enemy turns, Action or Bonus Action activities, and a resource-neutral generic turn timeline for ordered player and enemy events. Containers can be empty, duplicated, deleted, and reordered among their siblings. Generic timeline entries are useful for independent state events such as removing an effect; they do not require an Action or Bonus Action. Attacks configure a target armor class, attack modifier, normal/advantage/disadvantage roll mode, Cover, and one or more typed damage dice pools with independent modifiers. Attack rolls follow the natural 1 miss and natural 20 Critical Hit rules. A Critical Hit rolls every configured damage die twice and adds each pool modifier once; attack results show both hit and critical probabilities.

Events can be duplicated, deleted, and reordered within their activity with drag and drop or the move controls. Every event type can be placed in an Action, Bonus Action, or generic turn timeline, and contextual controls add rounds, turns, activities, and events.

The event picker exposes ability checks, Initiative, standalone typed damage, condition and effect application or removal, Help, Dodge, Grappled escape, and Concentration start/stop alongside attacks and saving throws. Each event family has editable, accessible controls and reports its execution chance. Initiative reports an expected total; state-only events report a no-damage outcome. The editor assumes attacks and saves can always target correctly, with mutual visibility, frightened line of sight, and the standard within-5-feet Prone, Paralyzed, and Unconscious relationships represented by the rules engine rather than spatial controls.

Player and enemy saving throws configure a save DC, save ability, roll mode (including voluntary automatic failure), Cover, one or more typed damage dice pools, and the damage taken on failure or success. Blank DC and modifier fields inherit from the relevant combatant state; entering a value creates an override and clearing it restores inheritance. A consequence can apply full damage, half the combined damage rounded down, or no damage. Initial combatant state can provide typed damage Immunity, Resistance, Vulnerability, and Heroic Inspiration; defenses are applied to each exact damage outcome in rules order.

Grapple and Shove are save-based player and enemy actions. Their targets use the better of their Strength and Dexterity save modifiers unless a specific ability and modifier are supplied. Failed saves apply Grappled or Prone respectively. Attacks may also include a condition-only follow-up save, which applies its success or failure conditions after a hit.

Grappled escapes use the grappler's DC and the escaping combatant's selected Strength or Dexterity save modifier by default. Either value can be overridden per escape; clearing an override restores inheritance.

The editor and probability model support nested conditional events. Choose **Conditional** from the event picker, select the combatant to inspect, configure ANDed required and absent conditions/effects (including exhaustion, Vex, Sap, and Dodging), then add its ordered child events. The child sequence executes only in matching probability branches.

Attacks can add Vex or Sap to their target on a hit. Saving throws can add either condition to their target on failure, success, or both. Vex grants advantage to the next attack against its target, while Sap gives disadvantage to the next attack made by its target. Applicable conditions are consumed by that attack, and opposing advantage and disadvantage cancel.

Every event produces a typed outcome. The summary groups expected damage against enemies separately from expected damage against players, reports each event's condition application chance, and shows the expected number of times each configured condition is applied to players and enemies across the sequence.

Builder calculations run in a background worker after a 250 ms pause in editing. Valid edits retain the last completed results while they are marked as updating; invalid drafts show unavailable results until their field-level validation errors are corrected.

Named scenario profiles save the complete editable draft locally in the browser. Profiles may be incomplete; they remain available to edit but are marked unavailable in the Sequence Evaluator until valid. The evaluator compares any number of saved profiles by their expected damage to enemies in each round, with both a responsive visual chart and an accessible data table. Profiles and their selections are local to the device; profile selections are temporary.

Event result metrics use distinct colour and Lucide icon treatments so execution, success, critical, damage, initiative, and condition outcomes can be scanned quickly. State snapshots use compact condition/effect icons with accessible names and hover labels; condition pickers and editable chips retain their full text labels.

Initial Player State and Enemy State panels expose all persistent conditions, Vex, Sap, exhaustion levels 0–6, condition immunities, typed damage defenses, Help, Dodge, Heroic Inspiration, and Concentration modifiers. Each initial condition can also specify its source, duration, counted turn, expiry boundary, and one repeated save or ongoing-damage trigger. The searchable condition picker uses compact chips and a scrollable, fuzzy-matched option list. When result snapshots become available, the timeline has a dedicated state summary target for state-before, state-after, and boundary results.

## Deferred

Named targets and multiple combatants, accounts, and a backend remain deferred. Profiles can be exported as versioned JSON and imported into another browser; importing always creates and loads a new local saved profile. Total Cover, spatial targeting, hit points, and shared damage rolls across multiple targets remain outside the current model. Action-resource scheduling remains flexible: events may be placed in either Action or Bonus Action activities without enforcing game-specific action restrictions.

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
