import { useContext } from "react";
import { LoadingContext } from "../providers/LoadingProvider";
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading richiede LoadingProvider.');
  return context;
}
