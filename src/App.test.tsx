import { render, screen, within } from '@testing-library/react'
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

describe('App', () => {
  it('shows the default player attack and its live outcome', () => {
    render(<App />)

    const attack = screen.getByRole('article', { name: /player attack/i })
    expect(within(attack).getByLabelText(/target ac/i)).toHaveValue(12)
    expect(within(attack).getByLabelText(/attack modifier/i)).toHaveValue(0)
    expect(within(attack).getByLabelText(/^dice$/i)).toHaveValue(1)
    expect(within(attack).getByLabelText(/die size/i)).toHaveValue('8')
    expect(within(attack).getByLabelText(/^modifier$/i)).toHaveValue(0)
    expect(within(attack).getByText('45%')).toBeInTheDocument()
    expect(screen.getAllByText('2.03')).toHaveLength(2)
    expect(
      screen.queryByText(/expected damage against players/i),
    ).not.toBeInTheDocument()
    expect(screen.getByText('1 event')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove event 1/i }),
    ).toBeDisabled()
  })

  it('adds each event type with independent defaults', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Enemy attack')
    await addEvent(user, 'Player saving throw')
    await addEvent(user, 'Enemy saving throw')

    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(
      screen.getByRole('article', { name: /enemy attack/i }),
    ).toBeInTheDocument()

    const playerSave = screen.getByRole('article', {
      name: /player saving throw/i,
    })
    expect(within(playerSave).getByLabelText(/save dc/i)).toHaveValue(12)
    expect(within(playerSave).getByLabelText(/save modifier/i)).toHaveValue(0)
    expect(within(playerSave).getByLabelText(/on failure/i)).toHaveValue('full')
    expect(within(playerSave).getByLabelText(/on success/i)).toHaveValue('half')
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

  it('builds the requested mixed sequence and aggregates both outcomes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Player attack')
    await addEvent(user, 'Enemy attack')
    await addEvent(user, 'Player saving throw')

    const totals = screen.getAllByText(/expected damage against/i, {
      selector: '.total-card span',
    })
    expect(totals).toHaveLength(2)
    expect(screen.getByText('4.05')).toBeInTheDocument()
    expect(screen.getByText('5.4')).toBeInTheDocument()
    expect(screen.getAllByText('4 events')).toHaveLength(2)
  })

  it('keeps events independently editable and removable', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Player attack')
    const armorClasses = screen.getAllByLabelText(/target ac/i)
    await user.clear(armorClasses[1])
    await user.type(armorClasses[1], '20')

    expect(armorClasses[0]).toHaveValue(12)
    expect(screen.getByText('2.25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove event 1/i }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('1 event')).toBeInTheDocument()
  })

  it('shows validation and withholds every summary for an invalid sequence', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addEvent(user, 'Enemy attack')
    const armorClass = screen.getAllByLabelText(/target ac/i)[0]
    await user.clear(armorClass)

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
})
