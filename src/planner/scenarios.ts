import { defaultAnswers } from "./defaults";
import type { RawAnswers } from "../domain/planning";

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  answers: RawAnswers;
}

export const simulationScenarios: SimulationScenario[] = [
  {
    id: "balanced-default",
    name: "Profilo bilanciato",
    description: "Settimana standard con carico sostenibile e focus al mattino.",
    answers: defaultAnswers
  },
  {
    id: "overloaded-builder",
    name: "Carico eccessivo",
    description: "Troppe ore richieste per vedere warning e saturazione del motore.",
    answers: {
      goals: [
        { name: "Startup", priority: 5, desiredWeeklyMinutes: 600 },
        { name: "Studio AI", priority: 5, desiredWeeklyMinutes: 420 },
        { name: "Fitness", priority: 4, desiredWeeklyMinutes: 240 },
        { name: "Lingua", priority: 3, desiredWeeklyMinutes: 240 }
      ],
      workStart: "09:00",
      workEnd: "19:00",
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      wake: "06:45",
      sleep: "23:45",
      focusMinutes: 90,
      flexibilityMode: "rigid",
      energyProfile: {
        morning: "medium",
        afternoon: "high",
        evening: "low"
      }
    }
  },
  {
    id: "evening-creative",
    name: "Creativo serale",
    description: "Profilo che rende l'energia serale dominante e sposta i blocchi focus.",
    answers: {
      goals: [
        { name: "Design portfolio", priority: 5, desiredWeeklyMinutes: 300 },
        { name: "Workout breve", priority: 3, desiredWeeklyMinutes: 120 },
        { name: "Lettura", priority: 2, desiredWeeklyMinutes: 90 }
      ],
      workStart: "10:00",
      workEnd: "18:30",
      workDays: ["mon", "tue", "wed", "thu", "fri"],
      wake: "08:00",
      sleep: "01:00",
      focusMinutes: 60,
      flexibilityMode: "flexible",
      energyProfile: {
        morning: "low",
        afternoon: "medium",
        evening: "high"
      }
    }
  },
  {
    id: "part-time-reset",
    name: "Part-time strategico",
    description: "Meno giorni di lavoro e blocchi piu' lunghi per vedere redistribuzione.",
    answers: {
      goals: [
        { name: "Prodotto", priority: 5, desiredWeeklyMinutes: 360 },
        { name: "Amministrazione", priority: 2, desiredWeeklyMinutes: 120 },
        { name: "Recupero", priority: 4, desiredWeeklyMinutes: 180 }
      ],
      workStart: "08:30",
      workEnd: "14:00",
      workDays: ["mon", "wed", "fri"],
      wake: "06:30",
      sleep: "22:30",
      focusMinutes: 120,
      flexibilityMode: "mixed",
      energyProfile: {
        morning: "high",
        afternoon: "medium",
        evening: "medium"
      }
    }
  }
];
