export { weekdayLabels, goalPriorityOptions, weeklyGoalDurationOptions, defaultAnswers } from "../constants.js";
import type { GoalInput } from "../model/planning.js";

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
