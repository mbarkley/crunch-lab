import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

async function addEvent(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('button', { name: /^add event$/i }))
  await user.click(screen.getByRole('button', { name }))
}

async function addCondition(
  user: ReturnType<typeof userEvent.setup>,
  scope: HTMLElement,
  name: string,
) {
  await user.click(
    within(scope).getByRole('button', { name: /^add condition$/i }),
  )
  await user.click(within(scope).getByRole('button', { name }))
}

describe('App', () => {
  it('shows the default player attack and its live outcome', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: 'Export profile' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Import profile' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Import profile file')).toHaveAttribute(
      'accept',
      'application/json,.json',
    )
    const attack = screen.getByRole('article', { name: /player attack/i })
    expect(within(attack).getByLabelText(/target ac/i)).toHaveValue(null)
    expect(within(attack).getByLabelText(/target ac/i)).toHaveAttribute(
      'placeholder',
      'Inherited AC',
    )
    expect(within(attack).getByLabelText(/^attack modifier$/i)).toHaveValue(
      null,
    )
    expect(within(attack).getByLabelText(/^attack modifier$/i)).toHaveAttribute(
      'placeholder',
      'Inherited modifier',
    )
    expect(within(attack).getByLabelText(/roll mode/i)).toHaveValue('normal')
    expect(within(attack).getByLabelText(/^dice \(1–20\)$/i)).toHaveValue(1)
    expect(within(attack).getByLabelText(/die size/i)).toHaveValue('8')
    expect(within(attack).getByLabelText(/^modifier$/i)).toHaveValue(0)
    expect(within(attack).getByText('45%')).toBeInTheDocument()
    const stateTransition = within(attack).getByLabelText('State transition')
    expect(
      within(stateTransition).getByLabelText('Before state'),
    ).toBeInTheDocument()
    expect(
      within(stateTransition).getByLabelText('After state'),
    ).toBeInTheDocument()
    const criticalChance = within(attack)
      .getByText('Critical Chance')
      .closest('span')!
    expect(within(criticalChance).getByText('5%')).toBeInTheDocument()
    expect(screen.getAllByText('2.25')).toHaveLength(2)
    expect(
      screen.queryByText(/expected damage against players/i),
    ).not.toBeInTheDocument()
    expect(screen.getByText('1 event')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove event 1/i }),
    ).toBeEnabled()
  })

  it('creates every event family from the contextual picker', async () => {
    const user = userEvent.setup()
    const labels = [
      'Enemy Attack',
      'Player Saving Throw',
      'Enemy Saving Throw',
      'Player Ability Check',
      'Enemy Ability Check',
      'Player Initiative',
      'Enemy Initiative',
      'Damage to Player',
      'Damage to Enemy',
      'Apply Condition',
      'Apply Effect',
      'Remove Condition',
      'Remove Effect',
      'Help',
      'Dodge',
      'Grappled Escape',
      'Start Concentration',
      'Stop Concentration',
    ]
    for (const label of labels) {
      const view = render(<App />)
      await addEvent(user, label)
      expect(screen.getByRole('article', { name: label })).toBeInTheDocument()
      view.unmount()
    }
  }, 15000)

  it('uses blank inherited values and clear add/remove labels for grappled escapes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Grappled Escape')
    const escape = screen.getByRole('article', { name: 'Grappled Escape' })
    const dc = within(escape).getByLabelText('DC')
    const modifier = within(escape).getByLabelText('Modifier')

    expect(dc).toHaveValue(null)
    expect(dc).toHaveAttribute('placeholder', 'Inherited')
    expect(modifier).toHaveValue(null)
    expect(modifier).toHaveAttribute('placeholder', 'Inherited')
    expect(
      within(escape).getByLabelText('On Failure: Add Conditions'),
    ).toBeInTheDocument()
    expect(
      within(escape).getByLabelText('On Success: Add Conditions'),
    ).toBeInTheDocument()
    expect(
      within(escape).getByLabelText('On Failure: Remove Conditions'),
    ).toBeInTheDocument()
    expect(
      within(escape).getByLabelText('On Success: Remove Conditions'),
    ).toBeInTheDocument()

    await user.type(dc, '14')
    await user.type(modifier, '3')
    await user.clear(dc)
    await user.clear(modifier)
    expect(dc).toHaveValue(null)
    expect(modifier).toHaveValue(null)
  })

  it('edits extended events and renders execution, initiative, no-damage, and condition results', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Player Ability Check')
    const ability = screen.getByRole('article', {
      name: 'Player Ability Check',
    })
    await user.clear(within(ability).getByLabelText('DC'))
    await user.type(within(ability).getByLabelText('DC'), '15')
    expect(within(ability).getByText('Execution Chance')).toBeInTheDocument()
    expect(within(ability).getByText('Success Chance')).toBeInTheDocument()

    await addEvent(user, 'Player Initiative')
    const initiative = screen.getByRole('article', {
      name: 'Player Initiative',
    })
    expect(
      within(initiative).getByText('Expected Initiative'),
    ).toBeInTheDocument()
    expect(within(initiative).getByText('10.5')).toBeInTheDocument()

    await addEvent(user, 'Apply Condition')
    const apply = screen.getByRole('article', { name: 'Apply Condition' })
    await user.click(
      within(apply).getByRole('button', { name: 'Add condition' }),
    )
    await user.click(within(apply).getByRole('button', { name: 'Paralyzed' }))
    expect(within(apply).getByText('Paralyzed')).toBeInTheDocument()
    expect(within(apply).getByText('No Damage')).toBeInTheDocument()

    await addEvent(user, 'Help')
    const help = screen.getByRole('article', { name: 'Help' })
    expect(within(help).getByLabelText('Owner')).toHaveValue('player')
    expect(within(help).getByText('Completed')).toBeInTheDocument()
  })

  it('keeps editable player and enemy initial state independent', async () => {
    const user = userEvent.setup()
    render(<App />)

    const playerState = screen.getByRole('region', { name: 'Player state' })
    const enemyState = screen.getByRole('region', { name: 'Enemy state' })
    await addCondition(user, playerState, 'Vex')
    await addCondition(user, enemyState, 'Sap')

    expect(within(playerState).getByText('Vex')).toBeInTheDocument()
    expect(within(enemyState).getByText('Sap')).toBeInTheDocument()
  })

  it('groups initial save modifiers under concise ability labels', () => {
    render(<App />)

    for (const stateName of ['Player state', 'Enemy state']) {
      const state = screen.getByRole('region', { name: stateName })
      const saveModifiers = within(state).getByRole('group', {
        name: 'Save Modifiers',
      })

      for (const ability of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
        expect(within(saveModifiers).getByLabelText(ability)).toHaveValue(0)
      }
      expect(
        within(saveModifiers).queryByLabelText('STR Modifier'),
      ).not.toBeInTheDocument()
    }
  })

  it('uses fuzzy condition search for initial state and changes the first result', async () => {
    const user = userEvent.setup()
    render(<App />)

    const enemyState = screen.getByRole('region', { name: 'Enemy state' })
    await user.click(
      within(enemyState).getByRole('button', { name: /^add condition$/i }),
    )
    const search = within(enemyState).getByRole('searchbox', {
      name: /search conditions/i,
    })
    await user.type(search, 'parl')
    expect(
      within(enemyState).getByRole('button', { name: 'Paralyzed' }),
    ).toBeInTheDocument()
    await user.click(
      within(enemyState).getByRole('button', { name: 'Paralyzed' }),
    )
    expect(within(enemyState).getByText('Paralyzed')).toBeInTheDocument()

    await user.click(within(enemyState).getByRole('button', { name: 'Vex' }))
    const attack = screen.getByRole('article', { name: /player attack/i })
    const hitChance = within(attack).getByText('Hit Chance').closest('span')!
    expect(within(hitChance).getByText('69.75%')).toBeInTheDocument()
  })

  it('exposes initial defenses, resources, exhaustion, and concentration controls', async () => {
    const user = userEvent.setup()
    render(<App />)

    const playerState = screen.getByRole('region', { name: 'Player state' })
    const exhaustion = within(playerState).getByLabelText(/exhaustion \(0–6\)/i)
    const constitutionSave = within(playerState).getByLabelText('CON')
    await user.clear(exhaustion)
    await user.type(exhaustion, '6')
    await user.clear(constitutionSave)
    await user.type(constitutionSave, '3')
    await user.click(
      within(playerState).getByRole('checkbox', {
        name: 'Player has Heroic Inspiration',
      }),
    )
    await user.click(
      within(playerState).getByRole('checkbox', {
        name: 'Player is concentrating',
      }),
    )
    await user.click(
      within(playerState).getByRole('button', { name: /add resistance/i }),
    )
    await user.click(within(playerState).getByRole('button', { name: 'Fire' }))

    expect(exhaustion).toHaveValue(6)
    expect(
      within(playerState).getByRole('checkbox', {
        name: 'Player has Heroic Inspiration',
      }),
    ).toBeChecked()
    expect(constitutionSave).toHaveValue(3)
    expect(
      within(playerState).queryByLabelText(/concentration con modifier/i),
    ).not.toBeInTheDocument()
    expect(within(playerState).getByText('Fire')).toBeInTheDocument()
  })

  it('allows an empty sequence and offers a one-click first event picker', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /remove event 1/i }))

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(
      screen.getByText(/no events in this activity yet/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/expected damage against/i),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^add event$/i }))
    await user.click(screen.getByRole('button', { name: 'Enemy Saving Throw' }))

    expect(
      screen.getByRole('article', { name: /enemy saving throw/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 event')).toBeInTheDocument()
  })

  it('duplicates an event with all of its current settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    const original = screen.getByRole('article', { name: /player attack/i })
    const armorClass = within(original).getByLabelText(/target ac/i)
    await user.clear(armorClass)
    await user.type(armorClass, '17')
    await user.click(
      within(original).getByRole('button', { name: /add dice pool/i }),
    )
    await addCondition(user, original, 'Vex')

    await user.click(
      within(original).getByRole('button', { name: /duplicate event 1/i }),
    )

    const copies = screen.getAllByRole('article', { name: /player attack/i })
    expect(copies).toHaveLength(2)
    expect(within(copies[1]).getByLabelText(/target ac/i)).toHaveValue(17)
    expect(
      within(copies[1]).getAllByLabelText(/^dice \(1–20\)$/i),
    ).toHaveLength(2)
    expect(within(copies[1]).getByText('Vex')).toBeInTheDocument()
    const fieldIds = copies.flatMap((copy) =>
      [...copy.querySelectorAll('input, select')].map((field) => field.id),
    )
    expect(new Set(fieldIds).size).toBe(fieldIds.length)
  })

  it('reorders events with controls and drag and drop', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Enemy Attack')

    await user.click(screen.getByRole('button', { name: /move event 2 up/i }))
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getByRole('heading').textContent),
    ).toEqual(['Enemy Attack', 'Player Attack'])

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: () => undefined,
    }
    const dragHandle = screen.getByRole('button', {
      name: /drag to reorder event 1/i,
    })
    fireEvent.dragStart(dragHandle, { dataTransfer })
    fireEvent.dragOver(screen.getAllByRole('article')[1], { dataTransfer })
    fireEvent.drop(screen.getAllByRole('article')[1], { dataTransfer })

    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getByRole('heading').textContent),
    ).toEqual(['Player Attack', 'Enemy Attack'])
  })

  it('adds, edits, and removes damage dice pools with independent modifiers', async () => {
    const user = userEvent.setup()
    render(<App />)

    const attack = screen.getByRole('article', { name: /player attack/i })
    expect(
      within(attack).getByRole('button', { name: /remove damage pool 1/i }),
    ).toBeDisabled()

    await user.click(
      within(attack).getByRole('button', { name: /add dice pool/i }),
    )
    const diceCounts = within(attack).getAllByLabelText(/^dice \(1–20\)$/i)
    const dieSizes = within(attack).getAllByLabelText(/die size/i)
    expect(diceCounts).toHaveLength(2)
    expect(diceCounts[1]).toHaveValue(1)
    expect(dieSizes[1]).toHaveValue('8')

    await user.clear(diceCounts[1])
    expect(diceCounts[1]).toHaveAttribute('aria-invalid', 'true')
    expect(
      [...attack.querySelectorAll('.attack-results strong')].map(
        (element) => element.textContent,
      ),
    ).toEqual(['—', '—', '—'])

    await user.type(diceCounts[1], '2')
    await user.selectOptions(dieSizes[1], '6')
    const modifier = within(attack).getAllByLabelText(/^modifier$/i)[1]
    await user.clear(modifier)
    await user.type(modifier, '3')
    expect(within(attack).getByText('7.1')).toBeInTheDocument()

    await user.click(
      within(attack).getByRole('button', { name: /remove damage pool 2/i }),
    )
    expect(within(attack).getAllByLabelText(/^dice \(1–20\)$/i)).toHaveLength(1)
    expect(within(attack).getByText('2.25')).toBeInTheDocument()
  })

  it('adds each event type with independent defaults', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Enemy Attack')
    await addEvent(user, 'Player Saving Throw')
    await addEvent(user, 'Enemy Saving Throw')

    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(
      screen.getByRole('article', { name: /enemy attack/i }),
    ).toBeInTheDocument()

    const playerSave = screen.getByRole('article', {
      name: /player saving throw/i,
    })
    expect(within(playerSave).getByLabelText(/^dc$/i)).toHaveValue(12)
    expect(within(playerSave).getByLabelText(/^save modifier$/i)).toHaveValue(0)
    expect(
      within(playerSave).getByRole('combobox', { name: /^on failure$/i }),
    ).toHaveValue('full')
    expect(
      within(playerSave).getByRole('combobox', { name: /^on success$/i }),
    ).toHaveValue('half')
    expect(within(playerSave).getByText('3.38')).toBeInTheDocument()

    expect(
      screen.getByText(/expected damage against enemies/i, {
        selector: '.total-card span',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/expected damage against players/i, {
        selector: '.total-card span',
      }),
    ).toBeInTheDocument()
  })

  it('exposes typed damage, Ability, Cover, and Inspiration controls', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Player Saving Throw')

    const save = screen.getByRole('article', { name: /player saving throw/i })
    await user.selectOptions(
      within(save).getByLabelText(/^ability$/i),
      'strength',
    )
    await user.selectOptions(
      within(save).getByLabelText(/^roll mode$/i),
      'automatic-failure',
    )
    await user.selectOptions(within(save).getByLabelText(/^cover$/i), 'half')
    await user.selectOptions(
      within(save).getByLabelText(/damage type/i),
      'fire',
    )
    await user.selectOptions(
      within(save).getByLabelText(/reroll policy/i),
      'damage-pool-threshold',
    )

    expect(within(save).getByLabelText(/^ability$/i)).toHaveValue('strength')
    expect(within(save).getByLabelText(/^roll mode$/i)).toHaveValue(
      'automatic-failure',
    )
    expect(within(save).getByLabelText(/^cover$/i)).toHaveValue('half')
    expect(within(save).getByLabelText(/damage type/i)).toHaveValue('fire')
    expect(within(save).getByLabelText(/reroll threshold/i)).toBeInTheDocument()
  })

  it('builds the requested mixed sequence and aggregates both outcomes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Player Attack')
    await addEvent(user, 'Enemy Attack')
    await addEvent(user, 'Player Saving Throw')

    const totals = screen.getAllByText(/expected damage against/i, {
      selector: '.total-card span',
    })
    expect(totals).toHaveLength(2)
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('5.63')).toBeInTheDocument()
    expect(screen.getAllByText('4 events')).toHaveLength(2)
  })

  it('keeps events independently editable and removable', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Player Attack')
    const armorClasses = screen.getAllByLabelText(/target ac/i)
    await user.clear(armorClasses[1])
    await user.type(armorClasses[1], '20')

    expect(armorClasses[0]).toHaveValue(null)
    expect(screen.getByText('2.25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove event 1/i }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('1 event')).toBeInTheDocument()
  })

  it('uses inherited attack values again when an override is cleared', async () => {
    const user = userEvent.setup()
    render(<App />)

    const attack = screen.getByRole('article', { name: /player attack/i })
    const armorClass = within(attack).getByLabelText(/target ac/i)
    const attackModifier = within(attack).getByLabelText(/^attack modifier$/i)

    await user.type(armorClass, '20')
    await user.type(attackModifier, '8')
    expect(screen.getByText('45%')).toBeInTheDocument()

    await user.clear(armorClass)
    expect(screen.getByText('85%')).toBeInTheDocument()
    await user.clear(attackModifier)
    expect(armorClass).toHaveValue(null)
    expect(attackModifier).toHaveValue(null)
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows validation and withholds every summary for an invalid sequence', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Enemy Attack')
    const armorClass = screen.getAllByLabelText(/target ac/i)[0]
    await user.type(armorClass, '0')

    expect(armorClass).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(/enter a whole number of at least 1/i),
    ).toBeInTheDocument()
    const summaryValues = document.querySelectorAll('.total-card strong')
    expect([...summaryValues].map((element) => element.textContent)).toEqual([
      '—',
      '—',
    ])
  })

  it('updates an attack for manually selected advantage and disadvantage', async () => {
    const user = userEvent.setup()
    render(<App />)

    const attack = screen.getByRole('article', { name: /player attack/i })
    const rollMode = within(attack).getByLabelText(/roll mode/i)
    await user.selectOptions(rollMode, 'advantage')

    expect(within(attack).getByText('69.75%')).toBeInTheDocument()
    expect(within(attack).getByText('9.75%')).toBeInTheDocument()
    expect(within(attack).getByText('3.58')).toBeInTheDocument()

    await user.selectOptions(rollMode, 'disadvantage')
    expect(within(attack).getByText('20.25%')).toBeInTheDocument()
    expect(within(attack).getByText('0.25%')).toBeInTheDocument()
    expect(within(attack).getByText('0.92')).toBeInTheDocument()
  })

  it('applies Vex to the next attack and aggregates its expected count', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Player Attack')

    const attacks = screen.getAllByRole('article', { name: /player attack/i })
    await addCondition(user, attacks[0], 'Vex')
    const firstConditions = within(attacks[0]).getByRole('group', {
      name: /target conditions/i,
    })
    await user.click(
      within(firstConditions).getByRole('button', { name: /add condition/i }),
    )
    expect(
      within(firstConditions).queryByRole('button', { name: 'Vex' }),
    ).not.toBeInTheDocument()
    expect(
      within(firstConditions).getByRole('button', { name: 'Sap' }),
    ).toBeInTheDocument()
    await user.click(
      within(firstConditions).getByRole('button', { name: /close/i }),
    )

    expect(within(attacks[1]).getByText('56.14%')).toBeInTheDocument()
    const firstApplication = within(attacks[0])
      .getByText('Vex applied')
      .closest('span')!
    expect(within(firstApplication).getByText('45%')).toBeInTheDocument()
    const aggregate = screen
      .getByText(/expected vex applications to enemies/i)
      .closest('aside')!
    expect(within(aggregate).getByText('0.45')).toBeInTheDocument()

    await addCondition(user, attacks[1], 'Vex')
    expect(within(aggregate).getByText('1.01')).toBeInTheDocument()
    expect(
      within(attacks[1]).getAllByText('56.14%', {
        selector: '.event-result-metrics *',
      }),
    ).toHaveLength(2)

    await user.click(
      within(attacks[0]).getByRole('button', {
        name: /remove vex target conditions/i,
      }),
    )
    const hitChance = within(attacks[1])
      .getByText('Hit Chance')
      .closest('span')!
    expect(within(hitChance).getByText('45%')).toBeInTheDocument()
  })

  it('groups expected condition applications by target', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Enemy Attack')

    const attacks = screen.getAllByRole('article')
    await addCondition(user, attacks[0], 'Vex')
    await addCondition(user, attacks[1], 'Vex')

    const enemyTotal = screen
      .getByText(/expected vex applications to enemies/i)
      .closest('aside')!
    const playerTotal = screen
      .getByText(/expected vex applications to players/i)
      .closest('aside')!
    expect(within(enemyTotal).getByText('0.45')).toBeInTheDocument()
    expect(within(playerTotal).getByText('0.45')).toBeInTheDocument()
  })

  it('configures and reports separate save-branch conditions', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addEvent(user, 'Enemy Saving Throw')

    const save = screen.getByRole('article', { name: /enemy saving throw/i })
    const failureConditions = within(save).getByRole('group', {
      name: /on failure/i,
    })
    const successConditions = within(save).getByRole('group', {
      name: /on success/i,
    })
    await addCondition(user, failureConditions, 'Vex')
    await addCondition(user, successConditions, 'Sap')

    const vexApplication = within(save)
      .getByText('Vex applied')
      .closest('span')!
    const sapApplication = within(save)
      .getByText('Sap applied')
      .closest('span')!
    expect(within(vexApplication).getByText('55%')).toBeInTheDocument()
    expect(within(sapApplication).getByText('45%')).toBeInTheDocument()

    const vexAggregate = screen
      .getByText(/expected vex applications to enemies/i)
      .closest('aside')!
    const sapAggregate = screen
      .getByText(/expected sap applications to enemies/i)
      .closest('aside')!
    expect(within(vexAggregate).getByText('0.55')).toBeInTheDocument()
    expect(within(sapAggregate).getByText('0.45')).toBeInTheDocument()
  })

  it('starts with the guided round, player turn, action hierarchy', () => {
    render(<App />)

    const round = screen.getByRole('region', { name: 'Round 1' })
    const turn = within(round).getByRole('region', { name: 'Player turn' })
    const activity = within(turn).getByRole('region', { name: 'Action' })
    expect(
      within(activity).getByRole('article', { name: /player attack/i }),
    ).toBeInTheDocument()
  })

  it('allows empty containers and adds any event type contextually', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /remove activity 1/i }))
    const playerTurn = screen.getByRole('region', { name: 'Player turn' })
    expect(
      within(playerTurn).getByText(/no activities in this turn yet/i),
    ).toBeInTheDocument()

    await user.click(
      within(playerTurn).getByRole('button', { name: /add bonus action/i }),
    )
    const bonusAction = within(playerTurn).getByRole('region', {
      name: 'Bonus action',
    })
    expect(
      within(bonusAction).getByText(/no events in this activity yet/i),
    ).toBeInTheDocument()

    await user.click(
      within(bonusAction).getByRole('button', { name: /^add event$/i }),
    )
    await user.click(
      within(bonusAction).getByRole('button', { name: 'Enemy Saving Throw' }),
    )
    expect(
      within(bonusAction).getByRole('article', {
        name: /enemy saving throw/i,
      }),
    ).toBeInTheDocument()

    await user.click(
      within(playerTurn).getByRole('button', {
        name: /add turn event timeline/i,
      }),
    )
    const genericTimeline = within(playerTurn).getByRole('region', {
      name: 'Turn timeline',
    })
    await user.click(
      within(genericTimeline).getByRole('button', { name: /^add event$/i }),
    )
    await user.click(
      within(genericTimeline).getByRole('button', { name: 'Remove Effect' }),
    )
    expect(
      within(genericTimeline).getByRole('article', { name: /remove effect/i }),
    ).toBeInTheDocument()
  })

  it('adds, duplicates, reorders, and removes nested siblings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add enemy turn/i }))
    const enemyTurn = screen.getByRole('region', { name: 'Enemy turn' })
    await user.click(
      within(enemyTurn).getByRole('button', { name: /^add action$/i }),
    )
    expect(
      within(enemyTurn).getByRole('region', { name: 'Action' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /move enemy turn 2 up/i }),
    )
    const firstRound = screen.getByRole('region', { name: 'Round 1' })
    expect(
      within(firstRound)
        .getAllByRole('region', { name: /turn$/i })
        .map((region) => region.getAttribute('aria-labelledby')),
    ).toEqual(['turn-2-title', 'turn-1-title'])

    await user.click(screen.getByRole('button', { name: /duplicate round 1/i }))
    expect(
      screen.getAllByRole('region', { name: /^round \d+$/i }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('article', { name: /player attack/i }),
    ).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /remove round 2/i }))
    expect(
      screen.getAllByRole('region', { name: /^round \d+$/i }),
    ).toHaveLength(1)
  })
})
