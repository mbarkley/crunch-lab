# Core resolution and damage rules

This file describes rules that extend Crunch Lab's existing attacks and saving
throws before a full turn model is available. Rules are paraphrased from SRD
5.2.1, principally “Playing the Game” (pp. 6–17) and “Rules Glossary”
(pp. 176–191).

## Critical hits

### Rule

A natural 20 on an attack roll hits regardless of modifiers or Armor Class and
is a Critical Hit. A Critical Hit rolls **all of the attack's damage dice
twice**, combines them, and then adds relevant modifiers once. This applies to
every damage die that is part of that attack, not only the weapon's base die.
See [SRD pp. 6 and 15](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=7).

A natural 1 always misses. Natural 1 and natural 20 automatic outcomes apply to
attack rolls; ordinary saving throws compare their total with the DC unless
another rule says otherwise.

### Current Crunch Lab behavior

Critical hits are **not handled correctly**. `attackTransitions` selects the
correct d20 for normal/Advantage/Disadvantage and treats a selected natural 20
as an automatic hit. It calculates one `averageDamage` value before inspecting
that roll, however, and assigns the same value to every successful attack.
Natural 20s therefore deal ordinary hit damage.

For the default `1d8`, modifier `+0`, AC 12, attack modifier `+0` example:

- Current expected damage: `0.45 × 4.5 = 2.025`.
- Correct expected damage: `0.40 × 4.5 + 0.05 × 9 = 2.25`.

The fix belongs in the existing framework. Build two damage distributions:

- normal hit: the configured dice pools once, then the modifier once;
- critical hit: every configured pool with twice its dice count, then the
  modifier once.

Apply the existing minimum-zero rule only after adding the modifier to each
distribution. This detail matters for negative modifiers; doubling a
post-modifier average is not equivalent to rolling twice the dice and adding
the modifier once.

The selected die determines critical chance under Advantage or Disadvantage:
`9.75%` with Advantage, `0.25%` with Disadvantage, and `5%` normally. The result
model should report hit and critical probabilities separately even though a
critical is also a hit.

Nearby attacks against a Paralyzed or Unconscious target create another way to
score a Critical Hit. That later feature needs distance and condition state,
but it should feed the same critical-damage calculation.

## Advantage and Disadvantage

Roll two d20s and use the higher for Advantage or lower for Disadvantage.
Multiple sources of the same kind never add more dice. If at least one source
of each kind applies, they cancel completely regardless of how many sources
exist. A reroll or die replacement affects only one of the two dice. See
[SRD p. 7](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=8).

The attack implementation already follows the two-die and cancellation rules
for its manual mode, Vex, and Sap. Scale this by collecting named roll modifiers
(`advantageSources` and `disadvantageSources`) and deriving one effective mode.
That allows conditions to compose without encoding every pairwise interaction.

Saving throws need the same roll mode. A save can also be voluntarily failed,
which should be an explicit automatic-failure mode rather than an extreme
modifier. See [SRD p. 6](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=7).

Heroic Inspiration can reroll any one die and consumes a held instance. A
useful simulator must also know _when the user chooses to spend it_. Represent
that as a policy such as “reroll a selected d20 when success would otherwise
fail” or a configurable threshold for a damage die. This is sequence state but
does not require rounds by itself.

## Cover

Cover has three degrees:

| Degree         | Effect                                       |
| -------------- | -------------------------------------------- |
| Half           | `+2` AC and `+2` to Dexterity saving throws. |
| Three-Quarters | `+5` AC and `+5` to Dexterity saving throws. |
| Total          | Cannot be targeted directly.                 |

Only the most protective applicable cover counts. See
[SRD p. 14](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=15).

Half and Three-Quarters Cover fit the current events after saving throws gain an
ability field. Total Cover is target legality and belongs with a spatial model;
until then, the editor could reject or disable the event when Total Cover is
selected.

## Damage types and defenses

The SRD defines Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic,
Piercing, Poison, Psychic, Radiant, Slashing, and Thunder damage. A damage type
does nothing alone, but Resistance, Vulnerability, and Immunity refer to it.

- Resistance halves affected damage, rounding down.
- Vulnerability doubles affected damage.
- Immunity prevents affected damage.
- Multiple applicable instances of Resistance or Vulnerability count once.
- Apply general adjustments, bonuses, penalties, and multipliers first;
  Resistance second; Vulnerability third.

See [SRD p. 16](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=17).

Each damage pool therefore needs a damage type. A single shared modifier becomes
ambiguous when pools have different types. Choose and document one of these UI
models before implementation:

1. move the modifier into each typed pool; or
2. retain a shared modifier but require the user to assign its damage type.

Apply defenses to each damage instance using the actual damage distribution,
not to total expected damage. This preserves rounding. If all target defenses
are configured directly on an event, the calculation fits the present event
shape. Reusable targets with persistent defenses require a combatant model.

## Saving throw damage

An effect that deals half damage on a successful save halves the damage that
would be dealt on failure and rounds down. Crunch Lab already combines all
configured pools and the shared modifier before rounding each possible roll,
which is correct for one damage instance. See
[SRD p. 15](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=16).

When an effect forces multiple targets to save simultaneously, the damage is
rolled once for all targets. This means their damage outcomes are correlated.
Independent per-target events can calculate each target's expectation, but
they cannot answer joint questions such as “what is the chance both targets
survive?” Supporting those questions requires named targets and a shared-roll
branch.

## Damage threshold

A target with a damage threshold ignores an entire attack or effect if that
single damage instance is below the threshold; meeting the threshold deals all
of it. See [SRD p. 179](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf#page=180).

This rule demonstrates why future sequence state must retain exact damage
outcomes rather than only expected damage. It needs a target property but no
turn timing.
