# Conditions relevant to combat probability

The 2024 condition definitions are in the
[SRD 5.2.1 Rules Glossary](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=177).
A condition lasts for the duration set by the effect that imposed it or until it
is countered. Separate instances can have separate durations, but a condition's
effects do not stack with themselves. Exhaustion is the exception because it
has levels.

Condition **type** and condition **instance** should consequently be separate
concepts. An instance needs its source, recipient, duration/removal rule, and
possibly a save DC. The effective condition set is derived from all active
instances. This prevents removing one short-duration instance from incorrectly
removing another longer instance of the same condition.

## Condition effects and dependencies

| Condition     | Probability-relevant core effects                                                                                                                                          | Modeling dependency                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Blinded       | The creature's attacks have Disadvantage; attacks against it have Advantage. Sight-based ability checks automatically fail.                                                | Attack effects fit sequence state. Full support needs ability-check type and sight predicates.           |
| Charmed       | The creature cannot attack or use damaging effects against the charmer. The charmer gains Advantage on social checks against it.                                           | Named source/target and event legality; ability checks for full support. Defer until that model exists.  |
| Deafened      | Hearing-dependent ability checks automatically fail.                                                                                                                       | Ability-check event and sensory tags. Low combat priority.                                               |
| Exhaustion    | Level 1–5 subtracts `2 × level` from all d20 tests; level 6 causes death. Speed also falls by `5 × level` feet.                                                            | Counter in sequence state and common d20-test pipeline; HP/terminal and movement state for full support. |
| Frightened    | Ability checks and attacks have Disadvantage while the source is in line of sight; the creature cannot willingly approach the source.                                      | Named source and line-of-sight/spatial relations.                                                        |
| Grappled      | Speed is 0. Attacks against anyone except the grappler have Disadvantage. The grappler can move the target at extra movement cost.                                         | Named grappler and movement. Escape consumes an action and uses the planned compound event.              |
| Incapacitated | No action, Bonus Action, or Reaction; Concentration ends; Initiative has Disadvantage if already Incapacitated.                                                            | Turn/action resources, concentration, and Initiative event.                                              |
| Invisible     | Initiative has Advantage. The creature benefits from unseen-attacker rules, subject to whether another creature can see it.                                                | Visibility relation, named combatants, Initiative.                                                       |
| Paralyzed     | Includes Incapacitated; Speed 0; Strength and Dexterity saves automatically fail; attacks against it have Advantage; a hit from within 5 feet is a Critical Hit.           | Condition inheritance, typed saves, distance, critical-hit path, and turns/actions.                      |
| Petrified     | Includes Incapacitated; Speed 0; attacks against it have Advantage; Strength and Dexterity saves automatically fail; Resistance to all damage; Immunity to Poisoned.       | Condition inheritance, typed saves, damage defenses/immunity, and turns/actions.                         |
| Poisoned      | Attacks and ability checks have Disadvantage.                                                                                                                              | Attack effect fits sequence state; ability-check event for full support.                                 |
| Prone         | Its attacks have Disadvantage. Attacks from within 5 feet have Advantage; farther attacks have Disadvantage. Standing costs half Speed and ends the condition.             | Distance and movement budget. Standing is an alternative inside the planned compound event.              |
| Restrained    | Speed 0; its attacks have Disadvantage; attacks against it have Advantage; Dexterity saves have Disadvantage.                                                              | Attack effects fit sequence state; typed saving throws complete it.                                      |
| Stunned       | Includes Incapacitated; Strength and Dexterity saves automatically fail; attacks against it have Advantage.                                                                | Typed saves and condition inheritance fit state; action suppression needs turns/actions.                 |
| Unconscious   | Includes Incapacitated and Prone; Speed 0; Strength and Dexterity saves automatically fail; attacks against it have Advantage; a hit from within 5 feet is a Critical Hit. | Nested conditions, distance, critical-hit path, turns/actions, and usually HP.                           |

The source details are on SRD pp.
[176–183](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=177)
and
[185–190](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=186).

## Generic mechanics to build once

Several conditions share effects. Implement these as composable mechanics
rather than bespoke branches for each condition:

- add an Advantage or Disadvantage source to a particular d20-test category;
- automatically fail a save of a particular ability;
- prohibit an event from spending an action resource;
- set or cap Speed;
- grant Resistance or condition Immunity;
- make a successful hit critical when a predicate such as distance is true;
- include another condition while the parent condition is active.

Advantage and Disadvantage still use the core cancellation rule after every
applicable source is collected.

## Removal and “shake off” behavior

Removal is a property of the effect that applied a condition, not generally of
the condition type. Generic effect instances should support at least:

- explicit/manual removal;
- removal after a fixed number of rounds;
- removal at the start or end of a named combatant's turn;
- a repeated save at the start or end of the recipient's turn;
- removal on damage or another trigger;
- an action, movement expenditure, or no-cost choice to remove it.

Grappled is the important core exception with a built-in escape procedure. The
affected creature can spend its action on a Strength (Athletics) or Dexterity
(Acrobatics) check against the escape DC; success ends the grapple. A grapple
also ends if the grappler is Incapacitated, the target leaves its reach, or the
grappler releases it. See
[SRD p. 181](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=182).

Prone ends when the creature spends movement equal to half its Speed to stand,
provided its Speed is not 0. See
[SRD p. 185](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=186).

## Condition Immunity

Condition Immunity prevents the condition from affecting the creature. Check
Immunity before adding an active condition instance. If the UI reports expected
condition applications, distinguish attempted applications from successful
applications or define the metric explicitly as successful applications. The
latter matches the current wording most closely.
