
import type { ActivityEvent, ActivityOutcome, WeeklyPlan } from "./planning.js";
import type { SimulatedBlockEvent } from "./simulationContracts.js";

export interface ProgressDashboardProps {
  plan: WeeklyPlan;
  events: Record<string, ActivityEvent>;
  simulatedEvents: SimulatedBlockEvent[];
  onClear: () => void;
}

export type DashboardMode = "real" | "simulated";

export interface DashboardEvent {
  blockId: string;
  outcome: ActivityOutcome;
  recovered?: boolean;
}

export interface ProgressRow {
  label: string;
  completed: number;
  attempted: number;
}

export interface ProgressChartProps { title: string; rows: ProgressRow[] }
