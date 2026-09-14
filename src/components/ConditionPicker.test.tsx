import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConditionPicker, type ConditionPickerOption } from './ConditionPicker'

const OPTIONS = [
  { value: 'blinded', label: 'Blinded' },
  { value: 'paralyzed', label: 'Paralyzed' },
  { value: 'poisoned', label: 'Poisoned' },
  { value: 'prone', label: 'Prone' },
  { value: 'restrained', label: 'Restrained' },
] as const satisfies readonly ConditionPickerOption[]

type Value = (typeof OPTIONS)[number]['value']

function PickerHarness({ initial = [] }: { initial?: readonly Value[] }) {
  const [selected, setSelected] = useState<readonly Value[]>(initial)
  return (
    <ConditionPicker
      id="target-conditions"
      label="Target conditions"
      options={OPTIONS}
      selected={selected}
      onChange={setSelected}
    />
  )
}

describe('ConditionPicker', () => {
  it('adds options and renders removable compact selections', async () => {
    const user = userEvent.setup()
    render(<PickerHarness initial={['blinded']} />)

    expect(screen.getByText('Blinded')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add condition' }))
    expect(
      screen.getByRole('searchbox', { name: /search target/i }),
    ).toHaveFocus()
    expect(
      screen.queryByRole('button', { name: 'Blinded' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Poisoned' }))
    expect(screen.getByText('Poisoned')).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: /search target/i }),
    ).toHaveFocus()

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Blinded from Target conditions',
      }),
    )
    expect(
      screen.queryByRole('button', {
        name: 'Remove Blinded from Target conditions',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Blinded' })).toBeInTheDocument()
  })

  it('uses case-insensitive ordered-character fuzzy matching', async () => {
    const user = userEvent.setup()
    render(<PickerHarness />)

    await user.click(screen.getByRole('button', { name: 'Add condition' }))
    const search = screen.getByRole('searchbox', { name: /search target/i })
    await user.type(search, 'PrLZ')

    const popup = screen.getByRole('list')
    expect(
      within(popup).getByRole('button', { name: 'Paralyzed' }),
    ).toBeInTheDocument()
    expect(
      within(popup).queryByRole('button', { name: 'Prone' }),
    ).not.toBeInTheDocument()
  })

  it('shows an empty result and adds the sole result with Enter', async () => {
    const user = userEvent.setup()
    render(<PickerHarness />)

    await user.click(screen.getByRole('button', { name: 'Add condition' }))
    const search = screen.getByRole('searchbox', { name: /search target/i })
    await user.type(search, 'xyz')
    expect(screen.getByRole('status')).toHaveTextContent(
      'No matching conditions.',
    )

    await user.clear(search)
    await user.type(search, 'pois')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Poisoned')).toBeInTheDocument()
  })

  it('supports arrow-key option navigation and Escape focus return', async () => {
    const user = userEvent.setup()
    render(<PickerHarness />)

    const trigger = screen.getByRole('button', { name: 'Add condition' })
    await user.click(trigger)
    const search = screen.getByRole('searchbox', { name: /search target/i })
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Blinded' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Paralyzed' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: 'Blinded' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(search).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('reports the complete updated value to a controlled parent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ConditionPicker
        id="immunities"
        label="Condition immunities"
        options={OPTIONS}
        selected={['prone']}
        onChange={onChange}
        addLabel="Add immunity"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add immunity' }))
    await user.click(screen.getByRole('button', { name: 'Restrained' }))
    expect(onChange).toHaveBeenCalledWith(['prone', 'restrained'])
  })
})
