import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useI18n } from './I18nContext'

interface HintContextValue {
  hint: string
  setHint: (hint: string) => void
}

const HintContext = createContext<HintContextValue | undefined>(undefined)

const getHintFromElement = (
  el: HTMLElement | null,
  t: (source: string, params?: Record<string, string | number>) => string
): string => {
  if (!el) return ''
  const hintAttr = el.getAttribute('data-hint')
  if (hintAttr) return hintAttr
  const title = el.getAttribute('title')
  if (title) return t('Действие: {value}', { value: title })
  const aria = el.getAttribute('aria-label')
  if (aria) return t('Действие: {value}', { value: aria })

  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const placeholder = (el as HTMLInputElement).placeholder
    if (placeholder) return t('Поле: {value}', { value: placeholder })
    return t('Поле ввода')
  }

  const text = el.textContent?.trim()
  if (text) return t('Действие: {value}', { value: text })
  return ''
}

export const HintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hint, setHint] = useState('')
  const { t } = useI18n()

  useEffect(() => {
    const handleOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const candidate = target.closest('button, a, [data-hint], input, select, textarea') as HTMLElement | null
      if (!candidate) return
      const nextHint = getHintFromElement(candidate, t)
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
  }, [t])

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
