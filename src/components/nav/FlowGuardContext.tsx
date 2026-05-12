"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface FlowGuard {
  /** True while the guided entry flow has unsaved work. */
  isDirty: boolean;
  /** Returns true if it's safe to navigate. Side-effects: shows the discard
   *  dialog when not safe and remembers the intended destination so the flow
   *  can complete navigation after the user confirms. */
  attemptLeave: (intent: () => void) => boolean;
}

const FlowGuardCtx = createContext<FlowGuard>({
  isDirty: false,
  attemptLeave: (intent) => {
    intent();
    return true;
  },
});

export function useFlowGuard() {
  return useContext(FlowGuardCtx);
}

/** Provider lives at the root so TopNav/BottomTabs can always read state.
 *  The guided flow registers itself via `useRegisterFlowGuard` below. */
export function FlowGuardProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const handlerRef = useRef<((intent: () => void) => boolean) | null>(null);

  const attemptLeave = useCallback((intent: () => void) => {
    const h = handlerRef.current;
    if (!h) {
      intent();
      return true;
    }
    return h(intent);
  }, []);

  return (
    <FlowGuardCtx.Provider value={{ isDirty, attemptLeave }}>
      <FlowGuardInternal.Provider
        value={{
          setDirty: setIsDirty,
          setHandler: (h) => {
            handlerRef.current = h;
          },
        }}
      >
        {children}
      </FlowGuardInternal.Provider>
    </FlowGuardCtx.Provider>
  );
}

const FlowGuardInternal = createContext<{
  setDirty: (v: boolean) => void;
  setHandler: (h: ((intent: () => void) => boolean) | null) => void;
}>({
  setDirty: () => {},
  setHandler: () => {},
});

export function useRegisterFlowGuard() {
  return useContext(FlowGuardInternal);
}
