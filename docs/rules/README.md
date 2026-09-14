# D&D 2024 rules support research

This directory records candidate rules for Crunch Lab from the 2024 revision of
the fifth-edition rules. The rules are often informally called “5.5e”; the
source document calls them **SRD 5.2.1**.

The research intentionally covers reusable core rules rather than named spells,
class features, feats, monsters, or other content-specific abilities.

## Source and license

Rules research is based on the [System Reference Document 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)
by Wizards of the Coast LLC, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
Page references below use the printed SRD page number. The separate
[D&D Beyond 2024 Basic Rules](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)
are a more convenient HTML rendering of the same core rules.

## Meaning of the support classifications

| Classification          | Meaning                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Existing framework      | Extend an existing attack/save calculation or its configuration. The ordered event sequence remains sufficient. |
| Sequence state          | Add state or a generic event, but no concept of rounds or action economy is required.                           |
| Combatant/spatial model | Identify individual sources and targets, track HP or damage types, or represent distance/visibility.            |
| Turn/action model       | Add rounds, turns, timing points, movement, action resources, reactions, or compound action choices.            |

“Existing framework” still means implementation work. It means the work can be
done without changing the event model's basic sequential structure.

## Summary of proposed rules

| Priority | Rule                                    | Why it matters to probability                                                            | Support classification                | Required new support                                                                                     |
| -------- | --------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0       | Critical-hit damage                     | Natural 20s currently hit but do not roll extra damage dice.                             | Existing framework                    | Separate normal-hit and critical-hit damage distributions.                                               |
| P0       | Attack critical probability             | Makes the source of the corrected expected damage visible.                               | Existing framework                    | Add critical probability to attack results and UI.                                                       |
| P1       | Saving throw Advantage/Disadvantage     | Many core effects alter saves, while saves currently always roll one d20.                | Existing framework                    | Add roll mode to saving throw events and reuse d20 selection.                                            |
| P1       | Voluntarily failed saving throws        | The 2024 rules allow a target to choose failure.                                         | Existing framework                    | Add an “automatic failure” save mode.                                                                    |
| P1       | Cover                                   | Half and Three-Quarters Cover change AC and Dexterity saves by fixed amounts.            | Existing framework                    | Add save ability and cover degree; apply +2/+5 to the appropriate defense.                               |
| P1       | Damage types                            | Damage defenses operate per damage type, so one untyped combined pool is insufficient.   | Existing framework                    | Give each damage pool a type and define how the shared modifier is typed.                                |
| P1       | Resistance, Vulnerability, and Immunity | Halving, doubling, or preventing damage materially changes distributions.                | Combatant/spatial model               | Target defenses by damage type and rules-order rounding per damage instance.                             |
| P1       | Blinded                                 | Changes attacks made by and against the affected creature.                               | Sequence state                        | Persistent condition state and generic Advantage/Disadvantage sources.                                   |
| P1       | Poisoned                                | Gives Disadvantage on attacks (and ability checks).                                      | Sequence state                        | Persistent condition state; ability-check events for its full effect.                                    |
| P1       | Restrained                              | Changes attacks made by/against the target and Dexterity saves.                          | Sequence state                        | Persistent condition state plus typed saves.                                                             |
| P1       | Stunned                                 | Attacks against the target gain Advantage and Strength/Dexterity saves fail.             | Turn/action model                     | Condition inheritance and auto-fail saves fit sequence state; preventing actions requires turns/actions. |
| P1       | Paralyzed                               | As Stunned, plus nearby hits automatically become critical hits.                         | Combatant/spatial + turn/action model | Distance, automatic criticals, condition inheritance, and action suppression.                            |
| P1       | Unconscious                             | As Paralyzed for attacks/saves, and it also applies Prone.                               | Combatant/spatial + turn/action model | Distance, automatic criticals, nested conditions, action suppression, and usually HP.                    |
| P1       | Prone                                   | Changes attacks based on distance and penalizes the creature's attacks.                  | Combatant/spatial + turn/action model | Near/far relation and movement expenditure to stand; use the planned compound-event choice.              |
| P1       | Grappled                                | Restricts targets of the creature's attacks and can be escaped with an action.           | Combatant/spatial + turn/action model | Named grappler, distance/movement, and the planned compound-event choice.                                |
| P2       | Frightened                              | Imposes Disadvantage only while the source is in line of sight.                          | Combatant/spatial model               | Named condition source and line-of-sight relation.                                                       |
| P2       | Petrified                               | Grants attack Advantage, auto-fails two save types, and resists all damage.              | Turn/action + combatant model         | Condition inheritance, action suppression, typed saves, and damage defenses.                             |
| P2       | Incapacitated                           | Prevents actions, Bonus Actions, and Reactions and breaks Concentration.                 | Turn/action model                     | Action resources, skipped choices, reactions, and concentration state.                                   |
| P2       | Invisible/unseen creatures              | Alters Initiative and attacks according to who can see whom.                             | Combatant/spatial model               | Visibility relation, named combatants, and Initiative events.                                            |
| P2       | Exhaustion                              | Applies a cumulative `-2 × level` to every d20 test.                                     | Sequence state                        | Integer condition level and a common d20-test modifier pipeline.                                         |
| P2       | Help (attack)                           | Grants Advantage to the next allied attack and expires at a turn boundary.               | Turn/action model                     | Named allies, an action cost, next-use consumption, and start-of-turn expiry.                            |
| P2       | Dodge                                   | Alters incoming attacks and Dexterity saves until the next turn.                         | Turn/action model                     | Action cost, visibility, Speed/condition dependencies, and timed expiry.                                 |
| P2       | Repeated saves and timed conditions     | Common effects repeat a save at a turn boundary or last a number of rounds.              | Turn/action model                     | Round/turn markers, start/end timing, duration metadata, and removal transitions.                        |
| P2       | Ongoing start/end-of-turn damage        | Needed for hazards and generic damage-over-time effects.                                 | Turn/action model                     | Timing-triggered events and persistent effect instances.                                                 |
| P2       | Concentration                           | Damage creates a Constitution save whose DC depends on the actual damage roll.           | Turn/action + combatant model         | Concentration state and triggered nested events that retain the damage outcome.                          |
| P2       | Heroic Inspiration/reroll one die       | Reroll decisions alter attacks, saves, damage, and Advantage interactions.               | Sequence state                        | Consumable resource plus a declared reroll policy operating on individual dice.                          |
| P3       | Reactions and Opportunity Attacks       | Adds attacks that interrupt movement and consumes one Reaction per turn cycle.           | Turn/action + spatial model           | Trigger ordering, movement/reach, visibility, and Reaction refresh.                                      |
| P3       | Ready                                   | Schedules a chosen action after a trigger and before the next turn.                      | Turn/action model                     | Trigger definitions, interruption, Reaction use, and expiry.                                             |
| P3       | Hit Points, Bloodied, and Temporary HP  | Enables kill chance, threshold effects, and survival analysis across attacks.            | Combatant model                       | Exact rolled-damage state, HP/maximum HP, temporary HP replacement, and terminal states.                 |
| P3       | Death saving throws and stabilization   | Enables probability of recovery, stability, or death over later turns.                   | Turn/action + combatant model         | HP, turn-start triggers, counters, critical-damage interaction, healing, and actions.                    |
| P3       | Damage threshold                        | Some targets ignore an entire damage instance below a threshold.                         | Combatant model                       | Preserve the distribution of rolled damage rather than only its expectation.                             |
| P3       | Shared damage roll for multiple targets | One area effect uses one damage roll for all simultaneous targets, creating correlation. | Combatant model                       | Multiple named targets and correlated branches from a shared roll.                                       |

Charmed and Deafened are intentionally not proposed for the first combat
roadmap. Charmed primarily prevents hostile targeting of one named source, and
Deafened primarily affects perception. They become useful after named
combatants, target legality, and ability-check events exist. Condition Immunity
should be added alongside the first general-purpose condition system.

## Suggested implementation order

1. Fix critical-hit damage and expose critical probability.
2. Add saving throw roll mode, voluntary failure, save ability, and Cover.
3. Type each damage pool and implement Resistance, Vulnerability, and Immunity.
4. Generalize sequence condition state for the attack/save effects of Blinded,
   Poisoned, and Restrained.
5. Introduce combatants, then rounds/turns/timing, then action resources and the
   planned compound event.
6. Add the remaining conditions and triggered systems on that foundation.

See [core-resolution.md](core-resolution.md), [conditions.md](conditions.md),
and [event-model.md](event-model.md) for rules and implementation notes.
