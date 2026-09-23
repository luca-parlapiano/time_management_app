import type { ReactNode } from "react";
import type { DBRepository } from "./database.js";

export interface DBProviderProps { children: ReactNode; repository?: DBRepository }
