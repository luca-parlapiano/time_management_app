import { createContext, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LoadingContextValue, LoadingEntry, LoadingOptions } from "../model/loading.js";
import type { LoadingOverlayProps, LoadingProviderProps } from "../model/LoadingProvider.js";

export const LoadingContext = createContext<LoadingContextValue | null>(null);
function LoadingOverlay({message}: LoadingOverlayProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="global-loading" aria-label={message} onCancel={event => event.preventDefault()}><div role="status"><span className="loading-spinner" aria-hidden="true" /><p>{message}</p></div></dialog>;
}
export function LoadingProvider({ children }: LoadingProviderProps) {
  const [entries, setEntries] = useState<LoadingEntry[]>([]);
  const sequence = useRef(0);
  const start = useCallback((options: LoadingOptions = {}) => {
    const id = ++sequence.current;
    setEntries(current => [...current, { id, mode: options.mode ?? 'local', scope: options.scope ?? 'default', message: options.message ?? 'Operazione in corso…' }]);
    let finished = false;
    return () => { if (!finished) { finished = true; setEntries(current => current.filter(entry => entry.id !== id)); } };
  }, []);
  const run = useCallback(async <T,>(operation: () => Promise<T>, options?: LoadingOptions): Promise<T> => {
    const finish = start(options);
    try { return await operation(); } finally { finish(); }
  }, [start]);
  const blockingEntry = entries.find(entry => entry.mode === 'blocking');
  const value = useMemo<LoadingContextValue>(() => ({ pending: entries.length, blocking: Boolean(blockingEntry), start, run,
    isLoading: scope => entries.some(entry => entry.mode !== "silent" && (!scope || entry.scope === scope)),
  }), [entries, blockingEntry, start, run]);
  return <LoadingContext.Provider value={value}>
    <div inert={Boolean(blockingEntry)} aria-busy={Boolean(blockingEntry)}>{children}</div>
    {blockingEntry && <LoadingOverlay message={blockingEntry.message} />}
  </LoadingContext.Provider>;
}
