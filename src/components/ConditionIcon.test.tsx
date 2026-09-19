import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CONDITION_CATALOG_TYPES,
  TRANSIENT_EFFECT_TYPES,
} from '../probability/conditions'
import { CONDITION_ICONS, ConditionIcon } from './ConditionIcon'

describe('ConditionIcon', () => {
  it('provides an icon for every supported condition and transient effect', () => {
    const supported = [...CONDITION_CATALOG_TYPES, ...TRANSIENT_EFFECT_TYPES]
    expect(Object.keys(CONDITION_ICONS).sort()).toEqual([...supported].sort())
  })

  it('exposes the full condition name while rendering a compact icon', () => {
    render(<ConditionIcon condition="paralyzed" label="Paralyzed" />)
    expect(screen.getByRole('img', { name: 'Paralyzed' })).toBeInTheDocument()
  })
})
