import { Plus, Search, X } from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import './ConditionPicker.css'

export interface ConditionPickerOption<Value extends string = string> {
  readonly value: Value
  readonly label: string
}

export interface ConditionPickerProps<Value extends string = string> {
  readonly id: string
  readonly label: string
  readonly options: readonly ConditionPickerOption<Value>[]
  readonly selected: readonly Value[]
  readonly onChange: (selected: readonly Value[]) => void
  readonly addLabel?: string
  readonly emptyLabel?: string
  readonly closeOnSelect?: boolean
  readonly removeLabel?: (option: ConditionPickerOption<Value>) => string
}

function fuzzyMatches(label: string, query: string) {
  const normalizedLabel = label.toLocaleLowerCase()
  const normalizedQuery = query.trim().toLocaleLowerCase()
  let labelIndex = 0

  for (const character of normalizedQuery) {
    labelIndex = normalizedLabel.indexOf(character, labelIndex)
    if (labelIndex === -1) return false
    labelIndex += 1
  }

  return true
}

export function ConditionPicker<Value extends string>({
  id,
  label,
  options,
  selected,
  onChange,
  addLabel = 'Add condition',
  emptyLabel = 'No matching conditions.',
  closeOnSelect = false,
  removeLabel,
}: ConditionPickerProps<Value>) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const labelId = `${id}-label`
  const popupId = `${id}-popup`
  const searchId = `${id}-search`
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  )
  const availableOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          !selectedSet.has(option.value) && fuzzyMatches(option.label, query),
      ),
    [options, query, selectedSet],
  )

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
  }, [isOpen])

  function openPicker() {
    setQuery('')
    setIsOpen(true)
  }

  function closePicker(returnFocus = true) {
    setIsOpen(false)
    setQuery('')
    if (returnFocus) {
      triggerRef.current?.focus()
    }
  }

  function addOption(value: Value) {
    if (!selectedSet.has(value)) onChange([...selected, value])
    if (closeOnSelect) {
      closePicker()
      return
    }
    setQuery('')
    searchRef.current?.focus()
  }

  function removeOption(value: Value) {
    onChange(selected.filter((selectedValue) => selectedValue !== value))
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && availableOptions.length > 0) {
      event.preventDefault()
      optionRefs.current[0]?.focus()
    }
    if (event.key === 'Enter' && availableOptions.length === 1) {
      event.preventDefault()
      addOption(availableOptions[0].value)
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      optionRefs.current[(index + 1) % availableOptions.length]?.focus()
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (index === 0) searchRef.current?.focus()
      else optionRefs.current[index - 1]?.focus()
    }
    if (event.key === 'Home') {
      event.preventDefault()
      optionRefs.current[0]?.focus()
    }
    if (event.key === 'End') {
      event.preventDefault()
      optionRefs.current[availableOptions.length - 1]?.focus()
    }
  }

  return (
    <div
      className="condition-picker"
      role="group"
      aria-labelledby={labelId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault()
          event.stopPropagation()
          closePicker()
        }
      }}
    >
      <span className="condition-picker-label" id={labelId}>
        {label}
      </span>
      <div className="condition-picker-selection">
        {selected.map((value) => {
          const option = optionByValue.get(value)
          if (!option) return null
          return (
            <span className="condition-picker-chip" key={value}>
              <span>{option.label}</span>
              <button
                type="button"
                aria-label={
                  removeLabel?.(option) ??
                  `Remove ${option.label} from ${label}`
                }
                onClick={() => removeOption(value)}
              >
                <X aria-hidden="true" size={13} strokeWidth={2.4} />
              </button>
            </span>
          )
        })}
        <button
          className="condition-picker-trigger"
          type="button"
          ref={triggerRef}
          aria-expanded={isOpen}
          aria-controls={popupId}
          onClick={() => (isOpen ? closePicker(false) : openPicker())}
        >
          {isOpen ? (
            <X aria-hidden="true" size={15} />
          ) : (
            <Plus aria-hidden="true" size={15} />
          )}
          {isOpen ? 'Close' : addLabel}
        </button>
      </div>

      {isOpen ? (
        <div className="condition-picker-popup" id={popupId}>
          <label className="condition-picker-search" htmlFor={searchId}>
            <Search aria-hidden="true" size={16} />
            <span className="visually-hidden">Search {label}</span>
            <input
              id={searchId}
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search conditions…"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </label>
          <ul className="condition-picker-options">
            {availableOptions.length > 0 ? (
              availableOptions.map((option, index) => (
                <li key={option.value}>
                  <button
                    className="condition-picker-option"
                    type="button"
                    ref={(element) => {
                      optionRefs.current[index] = element
                    }}
                    onClick={() => addOption(option.value)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li>
                <p className="condition-picker-empty" role="status">
                  {emptyLabel}
                </p>
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
