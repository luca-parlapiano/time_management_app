export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type EnergyLevel = "low" | "medium" | "high";

export type FlexibilityMode = "rigid" | "mixed" | "flexible";

export interface GoalInput {
  name: string;
  priority: number;
  desiredWeeklyMinutes: number;
}

export interface FixedCommitment {
  title: string;
  days: Weekday[];
  start: string;
  end: string;
}

export interface RawAnswers {
  goals: GoalInput[];
  workStart: string;
  workEnd: string;
  workDays: Weekday[];
  wake: string;
  sleep: string;
  focusMinutes: number;
  flexibilityMode: FlexibilityMode;
  energyProfile: Record<"morning" | "afternoon" | "evening", EnergyLevel>;
}

export interface UserProfile {
  goals: GoalInput[];
  planningHorizon: "weekly";
  fixedCommitments: FixedCommitment[];
  sleepWindow: { wake: string; sleep: string };
  availableTimeByDay: Record<Weekday, number>;
  energyProfile: RawAnswers["energyProfile"];
  slotSizeMinutes: number;
  flexibilityMode: FlexibilityMode;
}

export interface CalendarActivity {
  id: string;
  day: Weekday;
  start: string;
  end: string;
  title: string;
  kind: "commitment" | "focus" | "buffer" | "recovery";
  color: string;
  rationale: string;
}

export interface Calendar {
  activities: CalendarActivity[];
  timezone: string;
}

export interface WeeklyPlan {
  blocks: CalendarActivity[];
  summary: string[];
}

export interface PlanCapacityCheck {
  isCompatible: boolean;
  remainingWeeklyMinutes: number;
  weeklyCapacityMinutes: number;
  totalGoalMinutes: number;
  dailyIssues: string[];
  weeklyIssue?: string;
}

export interface DerivedFeatures {
  sleepMinutesPerDay: number;
  workMinutesPerWorkDay: number;
  totalGoalMinutes: number;
  weeklyCapacityMinutes: number;
  remainingWeeklyMinutes: number;
  focusBlockMinutes: number;
  estimatedFocusBlocks: number;
  preferredFocusWindow: "morning" | "afternoon" | "evening";
  workloadLevel: "light" | "balanced" | "stretched" | "overloaded";
}

export interface PlannerDecision {
  step: "normalize" | "capacity" | "allocation" | "buffer";
  impact: "info" | "decision" | "warning";
  title: string;
  detail: string;
}

export interface PlannerResult {
  profile: UserProfile;
  plan: WeeklyCalendar;
  capacityCheck: PlanCapacityCheck;
  derivedFeatures: DerivedFeatures;
  decisions: PlannerDecision[];
}

export type ActivityOutcome = "completed" | "skipped" | "not-needed";

export interface ActivityEvent {
  activityId: string;
  outcome: ActivityOutcome;
  recordedAt: string;
}
