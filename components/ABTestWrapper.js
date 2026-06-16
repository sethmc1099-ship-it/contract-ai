import { createContext, useContext } from 'react'

const VariantContext = createContext(null)

export function ABTestProvider({ variant, children }) {
  return (
    <VariantContext.Provider value={variant}>
      {children}
    </VariantContext.Provider>
  )
}

export function useVariant() {
  return useContext(VariantContext)
}

export default function ABTestWrapper({ variant, children }) {
  return (
    <ABTestProvider variant={variant}>
      {children}
    </ABTestProvider>
  )
}
