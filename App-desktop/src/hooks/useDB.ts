import { useContext } from "react";
import { DBContext } from "../providers/DBProvider";
export function useDB() {
  const context = useContext(DBContext);
  if (!context) throw new Error('useDB richiede DBProvider.');
  return context;
}
