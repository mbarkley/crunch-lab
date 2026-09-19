# Crunch Lab UI Style Guide

This guide governs every user-facing Crunch Lab control, result, and responsive
layout. It supplements the repository guidance in `AGENTS.md`; when the two
address the same UI concern, follow the more specific rule here.

## Forms and Controls

1. **Use a stable input grid.** Group related controls in a CSS grid with
   matching label space. Labels normally sit above their control on one line.
   When labels sit beside a control, they must be no wider than that control.
   Responsive breakpoints may reduce columns, but must not make a field jump to
   a different horizontal position merely because a neighboring control changes.
2. **Expand dependent controls in their own row.** A toggle that introduces
   additional controls must place that group in a dedicated, full-width row
   below the original grid. It may not push the existing controls sideways.
3. **Do not use toggles to hide one field.** Prefer a `None`/inactive option in
   a select, or an always-visible text/number field that is disabled while
   empty. For example, an optional override is represented by an empty numeric
   input; its placeholder names the inherited value. A multi-field detail group
   may still use a toggle, provided Rule 2 is followed.
4. **Size ordinary integer inputs for three digits.** Use the shared compact
   numeric-input class: it accommodates exactly three digits plus normal input
   padding. Do not stretch it to fill a broad grid column. Any narrower or
   wider numeric input needs a nearby CSS comment explaining the product reason.
5. **Use number inputs for integer values.** Put a restricted range in the
   title-case label, for example `Exhaustion (0–6)`. A die size is the intentional
   exception: use a dropdown because the supported die types are a meaningful,
   discrete game choice.
6. **Write concise, title-case labels.** Labels should be noun or adjective
   phrases rather than instructions: `Roll Mode`, `Die Size`, `Modifier`,
   `On Failure`, and `On Success` are preferred; `Use Custom AC` and
   `Remove on Failure` are not. Initialisms and stat abbreviations stay all caps.
7. **Keep contextual text short.** Omit words made clear by the section or
   label. In `Damage Consequences`, choices are `Full`, `Half`, and `None`, not
   `Full Damage`, `Half Damage`, and `No Damage`. In a saving throw, the label is
   `Ability`, not `Save Ability`.

## Tags, State, and Outcomes

8. **Place tag-add controls below selected tags.** Selected condition or damage
   tags form their own wrapping row. The add button always starts on a separate
   row below them; it never shares the tag row.
9. **Use semantic icon and colour treatments for outcomes.** Every event or
   outcome kind has a distinct Lucide icon. Use semantic CSS classes/tokens for
   Hit Chance, Critical Chance, Expected Damage, and Condition Applied; all
   condition applications share one colour while retaining their own condition
   icons. Do not use an icon as the only identifier for a statistic.
10. **Render ability statistics as abbreviations.** Use `STR`, `DEX`, `CON`,
    `INT`, `WIS`, and `CHA` wherever an ability statistic must be scanned among
    other stats. They are text, not icons.

## Accessibility and Exceptions

- Every icon that conveys a concept must expose that concept through an
  accessible name and a hover label (`title`). Decorative icons are
  `aria-hidden`.
- Maintain a visible label and an associated native control for every input.
- Preserve keyboard operation, focus styles, and live result announcements.
- Use `disabled` only when the accompanying copy or surrounding control makes
  the inactive state understandable.
- Document every deliberate numeric-width exception in a CSS comment adjacent
  to the rule. Die-size selects are already an approved exception to Rule 5.

## Review Checklist

- [ ] Related controls use stable grids at desktop and narrow widths.
- [ ] Expanding controls appear on a dedicated row without shifting siblings.
- [ ] No toggle hides a single field where an empty input or inactive select
      would communicate the same state.
- [ ] Integer controls are compact number inputs with visible ranges; only die
      size remains a numeric dropdown.
- [ ] Labels and select text are concise title-case noun/adjective phrases.
- [ ] Tag add buttons appear below, not beside, selected tags.
- [ ] Outcome/event icons are distinct, named on hover, and accessible; metric
      colours follow their semantic category.
- [ ] Ability statistics use all-caps three-letter abbreviations.
