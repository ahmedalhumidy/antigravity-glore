import { useState, useCallback, useEffect, createContext, useContext } from 'react';

interface WorkingContextProduct {
  id: string;
  name: string;
}

interface WorkingContextShelf {
  id: string;
  name: string;
}

interface WorkingContextState {
  lastProduct: WorkingContextProduct | null;
  lastShelf: WorkingContextShelf | null;
  lastAction: { type: string; timestamp: number } | null;
  sessionCount: number;
}

interface WorkingContextAPI extends WorkingContextState {
  setProduct: (product: WorkingContextProduct) => void;
  setShelf: (shelf: WorkingContextShelf) => void;
  clearContext: () => void;
  incrementSession: () => void;
}

const SESSION_KEY = 'working_context';
const SESSION_COUNT_KEY = 'session_count';

function loadState(): WorkingContextState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch { /* ignore */ }
  return { lastProduct: null, lastShelf: null, lastAction: null, sessionCount: 0 };
}

function loadSessionCount(): number {
  try {
    const raw = localStorage.getItem(SESSION_COUNT_KEY);
    if (raw) {
      const { count, date } = JSON.parse(raw);
      if (date === new Date().toISOString().split('T')[0]) return count;
    }
  } catch { /* ignore */ }
  return 0;
}

function saveSessionCount(count: number) {
  localStorage.setItem(SESSION_COUNT_KEY, JSON.stringify({
    count,
    date: new Date().toISOString().split('T')[0],
  }));
}

const WorkingContextCtx = createContext<WorkingContextAPI | null>(null);

export function WorkingContextProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkingContextState>(() => ({
    ...loadState(),
    sessionCount: loadSessionCount(),
  }));

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [state]);

  const setProduct = useCallback((product: WorkingContextProduct) => {
    setState(prev => ({
      ...prev,
      lastProduct: product,
      lastAction: { type: 'scan', timestamp: Date.now() },
    }));
  }, []);

  const setShelf = useCallback((shelf: WorkingContextShelf) => {
    setState(prev => ({
      ...prev,
      lastShelf: shelf,
      lastAction: { type: 'shelf', timestamp: Date.now() },
    }));
  }, []);

  const clearContext = useCallback(() => {
    setState(prev => ({ ...prev, lastProduct: null, lastShelf: null, lastAction: null }));
  }, []);

  const incrementSession = useCallback(() => {
    setState(prev => {
      const next = prev.sessionCount + 1;
      saveSessionCount(next);
      return { ...prev, sessionCount: next };
    });
  }, []);

  return (
    <WorkingContextCtx.Provider value={{ ...state, setProduct, setShelf, clearContext, incrementSession }}>
      {children}
    </WorkingContextCtx.Provider>
  );
}

export function useWorkingContext() {
  const ctx = useContext(WorkingContextCtx);
  if (!ctx) throw new Error('useWorkingContext must be inside WorkingContextProvider');
  return ctx;
}
