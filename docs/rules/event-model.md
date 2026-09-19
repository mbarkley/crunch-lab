# Event-model requirements for timed combat rules

Crunch Lab currently evaluates a linear list of attacks and saves. That is
enough for effects consumed by the next applicable event, such as Vex and Sap,
but it cannot identify “the start of your next turn,” spend an action, or
interrupt another creature's movement.

The 2024 rules organize combat into rounds. Every participant takes one turn in
Initiative order during a round. On a turn, a creature can normally move up to
its Speed and take one action; rules can also provide a Bonus Action, and a
Reaction refreshes at the start of the creature's next turn. See
[SRD pp. 12–13](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=13)
and [actions on p. 9](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=10).

## Minimum structural extension

The eventual event model needs these concepts:

| Concept         | Minimum information                                                | Rules unlocked                                                              |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Combatant       | Stable ID, side, relevant defenses/state                           | Named sources/targets, Grappled, Charmed, multiple combatants.              |
| Round           | Round index and ordered turns                                      | Round durations and repeated effects.                                       |
| Turn            | Acting combatant with explicit start/body/end timing points        | Expiry, repeated saves, ongoing damage, Reaction refresh.                   |
| Resource budget | Action, conditional Bonus Action, Reaction, and movement remaining | Incapacitated, standing, escape attempts, Dodge, Help, Opportunity Attacks. |
| Effect instance | Type, source, targets, application branch, expiry/removal rule     | Correct same-condition durations and source-sensitive conditions.           |
| Trigger         | Timing point or event predicate plus generated child event         | Concentration checks, damage-over-time, Ready, Opportunity Attacks.         |
| Compound event  | Ordered or conditional alternatives governed by a policy           | “Escape if Grappled, else attack” and other shake-off choices.              |

The editor may continue to present a guided sequence. These concepts do not
require a free-form graph; rounds can contain ordered turn sections, and turns
can contain ordered events. The current editor represents a turn's timeline as
an ordered `generic` activity alongside `action` and `bonus-action` activities.
Generic activities are resource-neutral, so events such as removing an effect
can be sequenced in a turn without being attached to an Action or Bonus Action.

## Timing vocabulary

Avoid storing duration as only a number of subsequent events. Use explicit
boundaries:

- start of source's turn;
- end of source's turn;
- start of recipient's turn;
- end of recipient's turn;
- start/end of next turn;
- start/end of round;
- after a fixed number of rounds;
- next applicable roll/event, then consumed;
- until a predicate or explicit removal event occurs.

An effect should say whether it expires before or after other events at the
same boundary. Processing a turn as `start triggers → chosen events → end
triggers → expiry` gives deterministic ordering, but individual rules may
require priorities within a timing point.

## Rules that specifically require this extension

### Timed conditions and repeated saves

Core effects frequently last until the start or end of a creature's next turn,
or let the target repeat a save at the end of each turn. The condition itself
does not define that schedule; the applying effect instance does. A repeated
save must branch state on every occurrence and remove only its own effect
instance on success.

### Ongoing damage

The core Burning hazard deals damage at the start of each of the affected
creature's turns and can be extinguished with an action or environmental
interaction. It is a useful generic test case without relying on a named spell.
See [SRD p. 176](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=177).

### Dodge and Help

Dodge consumes an action and lasts until the start of the actor's next turn. It
gives qualifying attacks against the actor Disadvantage and gives the actor
Advantage on Dexterity saves; Incapacitated or Speed 0 removes the benefit.
Help can give the next allied attack Advantage, but the benefit expires at the
start of the helper's next turn. See
[SRD pp. 180 and 182](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=181).

These are good acceptance tests for action spending, timed expiry, named allies,
and next-use consumption.

### Concentration

When a concentrating creature takes damage, it makes a Constitution save with
DC `max(10, floor(damage / 2))`, capped at 30. Failure ends the effect.
Incapacitation or death also ends it. See
[SRD p. 178](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=179).

This cannot be calculated correctly from expected damage. The damage roll must
branch first, its exact value must determine the DC, and the generated save must
branch from there. Model it as a triggered child event attached to a damage
transition.

### Reactions, Opportunity Attacks, and Ready

A creature can normally take one Reaction before it refreshes at the start of
its next turn. An Opportunity Attack is triggered immediately before a visible
creature leaves reach using its own movement/action economy. Ready spends an
action now to define a trigger and a later Reaction, expiring before the
creature's next turn. See
[SRD pp. 14 and 184–186](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=15).

These require interruption ordering and a spatial model in addition to turn
resources. They should follow the simpler timed-condition work.

## HP-dependent future layer

Hit Points add useful outputs such as chance to reduce a target to 0, chance to
remain conscious, and expected overkill. They require carrying exact damage
outcomes through sequence state. Temporary HP absorbs damage first and does not
stack; when new temporary HP is offered, a policy chooses the old or new value.
See [SRD pp. 15–17](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=16).

At 0 HP, a creature usually becomes Unconscious. At the start of each of its
turns it makes a death save: three successes stabilize it, three failures kill
it, a natural 1 adds two failures, and a natural 20 restores 1 HP. Damage at 0
adds a failure, or two if the damage is from a Critical Hit. This depends on HP,
turn-start triggers, counters, healing, and the corrected critical-hit marker,
so it belongs after those foundations.

## State-space caution

Exact distributions can grow quickly once they include combatant HP, condition
instances, resource budgets, and triggers. Continue aggregating equivalent
states, but make the state key describe every value that can affect a later
event. Expected damage alone is not a sufficient key for thresholds,
Concentration, HP, or correlated multi-target damage.
