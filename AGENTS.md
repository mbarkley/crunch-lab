# Crunch Lab agent guidance

These instructions apply to the entire repository.

## Project shape

Crunch Lab is a browser-only React and TypeScript application built with Vite. It must remain deployable as static files to GitHub Pages.

- `src/App.tsx` owns the editor UI, draft form state, validation, and sequence presentation.
- `src/probability/distribution.ts` contains generic probability primitives.
- `src/probability/event.ts` contains combat-event and sequence calculations.
- `src/App.css` and `src/index.css` contain the custom styling.
- `design/guided-sequence-mockup.html` is a visual reference, not application code.

Read `README.md` before changing product behavior. Its “Deferred” section identifies features that are intentionally out of scope.

## Implementation conventions

- Keep probability calculations pure and independent of React.
- Use `calculateSequence` as the source of truth for sequence-dependent results. Do not reproduce probability logic in UI components.
- Preserve the distinction between editable drafts, which store numeric inputs as strings, and validated probability configs, which use numbers.
- Update state immutably.
- Give every event and damage pool a stable, unique ID. These IDs are used for React keys and accessible form-control associations.
- Preserve natural 1 and natural 20 attack behavior and the existing Vex/Sap consumption rules unless the task explicitly changes them.
- Keep changes focused. Do not refactor unrelated code as part of a feature or bug fix.

## UI conventions

- Use the existing custom CSS and `lucide-react` icon set before adding dependencies.
- Match the guided sequence layout rather than introducing a free-form canvas.
- Keep controls usable at narrow viewport widths.
- Provide visible focus states, accessible labels, and keyboard alternatives for pointer interactions such as drag and drop.
- Prefer semantic queries and elements: buttons for actions, labels for inputs, articles for events, and live regions for changing results.
- Preserve the empty-sequence state and the ability to choose any event type as the first event.

## Tests

- Put probability behavior in focused unit tests beside the probability modules.
- Test UI behavior through React Testing Library using accessible roles, labels, and `userEvent`.
- When changing sequence order or conditions, verify the resulting calculations as well as the visible order when relevant.
- Add regression coverage for bugs that can be exercised in jsdom. Validate purely visual CSS fixes through responsive CSS review.

Before handing off a change, run:

```sh
npm test
npm run lint
npm run build
npm run format:check
```

All four commands must pass. The project requires Node 24 and npm.

## Documentation and version control

- Update `README.md` when shipped behavior or the deferred-feature list changes.
- Do not edit generated `dist` output.
- Preserve unrelated working-tree changes.
- Commit or push only when the user explicitly requests it.
