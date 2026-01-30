import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

interface HintContextValue {
  hint: string
  setHint: (hint: string) => void
}

const HintContext = createContext<HintContextValue | undefined>(undefined)

const getHintFromElement = (el: HTMLElement | null): string => {
  if (!el) return ''
  const hintAttr = el.getAttribute('data-hint')
  if (hintAttr) return hintAttr
  const title = el.getAttribute('title')
  if (title) return `Действие: ${title}`
  const aria = el.getAttribute('aria-label')
  if (aria) return `Действие: ${aria}`

  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const placeholder = (el as HTMLInputElement).placeholder
    if (placeholder) return `Поле: ${placeholder}`
    return 'Поле ввода'
  }

  const text = el.textContent?.trim()
  if (text) return `Действие: ${text}`
  return ''
}

export const HintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hint, setHint] = useState('')

  useEffect(() => {
    const handleOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const candidate = target.closest('button, a, [data-hint], input, select, textarea') as HTMLElement | null
      if (!candidate) return
      const nextHint = getHintFromElement(candidate)
      setHint(nextHint)
    }

    const handleOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const candidate = target.closest('button, a, [data-hint], input, select, textarea') as HTMLElement | null
      if (!candidate) return
      setHint('')
    }

    document.addEventListener('mouseover', handleOver)
    document.addEventListener('mouseout', handleOut)

    return () => {
      document.removeEventListener('mouseover', handleOver)
      document.removeEventListener('mouseout', handleOut)
    }
  }, [])

  const value = useMemo(() => ({ hint, setHint }), [hint])

  return <HintContext.Provider value={value}>{children}</HintContext.Provider>
}

export const useHint = () => {
  const context = useContext(HintContext)
  if (!context) {
    return { hint: '', setHint: () => {} }
  }
  return context
}
