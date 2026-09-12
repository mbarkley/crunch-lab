import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the default attack and its live results', () => {
    render(<App />)

    const attack = screen.getByRole('article', { name: /roll a d20 to hit/i })
    expect(within(attack).getByLabelText(/minimum roll to hit/i)).toHaveValue(
      12,
    )
    expect(within(attack).getByLabelText(/^dice$/i)).toHaveValue(1)
    expect(within(attack).getByLabelText(/die size/i)).toHaveValue('8')
    expect(within(attack).getByLabelText(/modifier/i)).toHaveValue(0)
    expect(within(attack).getByText('45%')).toBeInTheDocument()
    expect(screen.getAllByText('2.03')).toHaveLength(2)
    expect(screen.getByText('1 attack')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove attack 1/i }),
    ).toBeDisabled()
  })

  it('updates results and copies the final attack when adding one', async () => {
    const user = userEvent.setup()
    render(<App />)

    const attack = screen.getByRole('article', { name: /roll a d20 to hit/i })
    const threshold = within(attack).getByLabelText(/minimum roll to hit/i)
    const dice = within(attack).getByLabelText(/^dice$/i)
    const dieSize = within(attack).getByLabelText(/die size/i)
    const modifier = within(attack).getByLabelText(/modifier/i)

    await user.clear(threshold)
    await user.type(threshold, '10')
    await user.clear(dice)
    await user.type(dice, '2')
    await user.selectOptions(dieSize, '6')
    await user.clear(modifier)
    await user.type(modifier, '3')
    await user.click(screen.getByRole('button', { name: /add attack/i }))

    const attacks = screen.getAllByRole('article')
    expect(attacks).toHaveLength(2)
    expect(
      within(attacks[1]).getByLabelText(/minimum roll to hit/i),
    ).toHaveValue(10)
    expect(within(attacks[1]).getByLabelText(/^dice$/i)).toHaveValue(2)
    expect(within(attacks[1]).getByLabelText(/die size/i)).toHaveValue('6')
    expect(within(attacks[1]).getByLabelText(/modifier/i)).toHaveValue(3)
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('keeps copied attacks independently editable and removable', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /add attack/i }))
    const thresholds = screen.getAllByLabelText(/minimum roll to hit/i)
    await user.clear(thresholds[1])
    await user.type(thresholds[1], '20')

    expect(thresholds[0]).toHaveValue(12)
    expect(screen.getByText('2 attacks')).toBeInTheDocument()
    expect(screen.getByText('2.25')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove attack 1/i }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('1 attack')).toBeInTheDocument()
  })

  it('shows validation and withholds results for an invalid sequence', async () => {
    const user = userEvent.setup()
    render(<App />)

    const threshold = screen.getByLabelText(/minimum roll to hit/i)
    await user.clear(threshold)

    expect(threshold).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(/enter a whole number from 1 to 20/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})
