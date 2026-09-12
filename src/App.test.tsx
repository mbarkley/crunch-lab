import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the guided sequence direction', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /build a sequence/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /view the selected guided-sequence reference/i,
      }),
    ).toHaveAttribute('href', './design/guided-sequence-mockup.html')
  })
})
