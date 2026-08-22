import type { GoalInput, RawAnswers, Weekday } from "../domain/planning";

export const weekdayLabels: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Gio" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" }
];

export const goalPriorityOptions = [1, 2, 3, 4, 5];

export const weeklyGoalDurationOptions = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 30
);

export const defaultAnswers: RawAnswers = {
  goals: [
    { name: "Studio AI", priority: 5, desiredWeeklyMinutes: 300 },
    { name: "Fitness", priority: 3, desiredWeeklyMinutes: 180 },
    { name: "Deep work", priority: 4, desiredWeeklyMinutes: 240 }
  ],
  workStart: "09:00",
  workEnd: "18:00",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  wake: "07:00",
  sleep: "23:30",
  focusMinutes: 60,
  flexibilityMode: "mixed",
  energyProfile: {
    morning: "high",
    afternoon: "medium",
    evening: "low"
  }
};

export function createEmptyGoal(): GoalInput {
  return {
    name: "",
    priority: 3,
    desiredWeeklyMinutes: 120
  };
}

export function formatWeeklyGoalDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min / settimana`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "ora" : "ore"} / settimana`;
  }

  return `${hours} ${hours === 1 ? "ora" : "ore"} e ${remainingMinutes} min / settimana`;
}
