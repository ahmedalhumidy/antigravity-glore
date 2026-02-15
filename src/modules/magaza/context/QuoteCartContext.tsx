import { createContext, useContext, ReactNode } from 'react';
import { useQuoteCart } from '../hooks/useQuoteCart';

type QuoteCartContextType = ReturnType<typeof useQuoteCart>;

const QuoteCartContext = createContext<QuoteCartContextType | null>(null);

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const cart = useQuoteCart();
  return (
    <QuoteCartContext.Provider value={cart}>
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCartContext() {
  const ctx = useContext(QuoteCartContext);
  if (!ctx) throw new Error('useQuoteCartContext must be used within QuoteCartProvider');
  return ctx;
}
