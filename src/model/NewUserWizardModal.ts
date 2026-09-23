import type { FlexibilityMode, GoalInput, RawAnswers, Weekday } from "./planning.js";

export interface NewUserWizardModalProps {
  onClose: () => void;
  onSubmit: (submission: NewUserWizardSubmission) => void;
}

export interface NewUserWizardSubmission {
  answers: RawAnswers;
  selectedPlan: {
    id: string;
    title: string;
    description: string;
  };
}

export interface FixedScheduleDraft {
  id: string;
  title: string;
  start: string;
  end: string;
  days: Weekday[];
}

export interface NewUserWizardDraft {
  goals: GoalInput[];
  planDuration: "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";
  fixedSchedules: FixedScheduleDraft[];
  protectedSchedules: FixedScheduleDraft[];
  sleepHoursTarget: number;
  energyProfile: RawAnswers["energyProfile"];
  focusBlockMinutes: number;
  workStyle: "deep_work" | "alternating" | "short_sprints";
  flexibilityMode: FlexibilityMode;
  planIntensity: "light" | "balanced" | "push";
  mainDifficulties: Array<
    "procrastination" | "overload" | "context_switching" | "unexpected_events"
  >;
  selectedPreviewId?: string;
}

export interface PlanPreviewOption {
  id: string;
  title: string;
  summary: string;
  focusLabel: string;
  bufferLabel: string;
  description: string;
  weekPreview: Array<{
    day: string;
    slots: Array<"focus" | "support" | "buffer" | "free">;
  }>;
}
