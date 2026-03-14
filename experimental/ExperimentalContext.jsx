/**
 * ExperimentalContext.jsx
 *
 * Provides shared state from useAppData to all experimental pages.
 * ExperimentalLayout is the single owner of this context.
 */

import { createContext, useContext } from 'react';

const ExperimentalContext = createContext(null);

export function useExperimentalContext() {
  const context = useContext(ExperimentalContext);
  if (!context) {
    throw new Error('useExperimentalContext must be used within ExperimentalLayout');
  }
  return context;
}

export default ExperimentalContext;
