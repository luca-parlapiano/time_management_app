import type {
  DerivedFeatures,
  GoalInput,
  PlanCapacityCheck,
  PlannerDecision,
  PlannerResult,
  RawAnswers,
  UserProfile,
  Weekday,
  WeeklyPlan
} from "../domain/planning";

const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Converte un orario "HH:MM" in minuti totali per poter fare calcoli numerici.
function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDurationMinutes(start: string, end: string) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (endMinutes <= startMinutes) {
    return 24 * 60 - startMinutes + endMinutes;
  }

  return endMinutes - startMinutes;
}

function clampMinutes(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDayMinutes(totalMinutes: number) {
  const minutesInDay = 24 * 60;
  return ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
}

// Fa l'operazione opposta: da minuti totali torna alla stringa "HH:MM".
function toTime(totalMinutes: number) {
  const normalizedMinutes = normalizeDayMinutes(totalMinutes);
  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalizedMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Usa la priorita' per dare un colore piu' evidente ai goal importanti.
function pickFocusColor(priority: number) {
  if (priority >= 5) {
    return "#d26843";
  }

  if (priority >= 4) {
    return "#d79b49";
  }

  return "#6897a8";
}

function getPreferredFocusWindow(profile: UserProfile): DerivedFeatures["preferredFocusWindow"] {
  const ranking = [
    { key: "morning", value: profile.energyProfile.morning },
    { key: "afternoon", value: profile.energyProfile.afternoon },
    { key: "evening", value: profile.energyProfile.evening }
  ] as const;
  const scoreByEnergy = {
    low: 1,
    medium: 2,
    high: 3
  };

  return ranking.sort((left, right) => {
    return scoreByEnergy[right.value] - scoreByEnergy[left.value];
  })[0].key;
}

function getWorkloadLevel(
  remainingWeeklyMinutes: number,
  weeklyCapacityMinutes: number
): DerivedFeatures["workloadLevel"] {
  if (remainingWeeklyMinutes < 0) {
    return "overloaded";
  }

  const remainingRatio = remainingWeeklyMinutes / weeklyCapacityMinutes;

  if (remainingRatio < 0.12) {
    return "stretched";
  }

  if (remainingRatio < 0.3) {
    return "balanced";
  }

  return "light";
}

// Crea una disponibilita' base settimanale semplificata per il prototipo.
function buildDefaultAvailableTime(workDays: Weekday[]) {
  return weekdays.reduce<Record<Weekday, number>>((acc, day) => {
    acc[day] = workDays.includes(day) ? 120 : 240;
    return acc;
  }, {} as Record<Weekday, number>);
}

export function checkPlanCapacity(raw: RawAnswers): PlanCapacityCheck {
  const sleepMinutes = getDurationMinutes(raw.sleep, raw.wake);
  const workMinutes = getDurationMinutes(raw.workStart, raw.workEnd);
  const totalGoalMinutes = raw.goals.reduce((total, goal) => {
    if (goal.name.trim().length === 0) {
      return total;
    }

    return total + goal.desiredWeeklyMinutes;
  }, 0);

  const dailyIssues = weekdays.flatMap((day) => {
    const workLoad = raw.workDays.includes(day) ? workMinutes : 0;
    const totalDailyMinutes = sleepMinutes + workLoad;

    if (totalDailyMinutes <= 24 * 60) {
      return [];
    }

    const overflowMinutes = totalDailyMinutes - 24 * 60;
    const label = day.toUpperCase();
    return [
      `${label}: lavoro e sonno superano il limite giornaliero di ${Math.ceil(
        overflowMinutes / 60
      )}h.`
    ];
  });

  const weeklyCapacityMinutes =
    weekdays.length * 24 * 60 - sleepMinutes * weekdays.length - workMinutes * raw.workDays.length;
  const remainingWeeklyMinutes = weeklyCapacityMinutes - totalGoalMinutes;
  const weeklyIssue =
    remainingWeeklyMinutes < 0
      ? `Gli obiettivi richiedono ${Math.ceil(
          Math.abs(remainingWeeklyMinutes) / 60
        )}h in piu' rispetto al tempo settimanale disponibile.`
      : undefined;

  return {
    isCompatible: dailyIssues.length === 0 && remainingWeeklyMinutes >= 0,
    remainingWeeklyMinutes,
    weeklyCapacityMinutes,
    totalGoalMinutes,
    dailyIssues,
    weeklyIssue
  };
}

// Trasforma le risposte della UI in un profilo stabile che il planner puo' usare.
export function normalizeAnswers(raw: RawAnswers): UserProfile {
  return {
    goals: raw.goals,
    planningHorizon: "weekly",
    fixedCommitments: [
      {
        title: "Lavoro",
        days: raw.workDays,
        start: raw.workStart,
        end: raw.workEnd
      }
    ],
    sleepWindow: {
      wake: raw.wake,
      sleep: raw.sleep
    },
    availableTimeByDay: buildDefaultAvailableTime(raw.workDays),
    energyProfile: raw.energyProfile,
    slotSizeMinutes: 30,
    flexibilityMode: raw.flexibilityMode
  };
}

// Duplica ogni impegno fisso sui giorni indicati, cosi' il calendario parte gia' bloccato.
function blocksForCommitments(profile: UserProfile): WeeklyPlan["blocks"] {
  return profile.fixedCommitments.flatMap((commitment) =>
    commitment.days.map((day) => ({
      id: `${day}-${commitment.title.toLowerCase()}`,
      day,
      start: commitment.start,
      end: commitment.end,
      title: commitment.title,
      kind: "commitment" as const,
      color: "#c9d5e0",
      rationale: "Impegno fisso bloccato prima della pianificazione."
    }))
  );
}

function getFocusStartMinutes(
  profile: UserProfile,
  day: Weekday,
  workDays: Weekday[],
  preferredFocusWindow: DerivedFeatures["preferredFocusWindow"],
  duration: number
) {
  const isWorkDay = workDays.includes(day);
  const wakeMinutes = toMinutes(profile.sleepWindow.wake);
  const sleepMinutes = toMinutes(profile.sleepWindow.sleep);
  const daySleepCutoff = sleepMinutes <= wakeMinutes ? 24 * 60 : sleepMinutes;
  const workCommitment = profile.fixedCommitments.find((commitment) =>
    commitment.days.includes(day)
  );
  const workStartMinutes = workCommitment ? toMinutes(workCommitment.start) : undefined;
  const workEndMinutes = workCommitment ? toMinutes(workCommitment.end) : undefined;
  const fallbackWorkEnd = workEndMinutes ?? 18 * 60;

  const baseWindows = {
    morning: {
      label: "morning" as const,
      start: Math.max(wakeMinutes, isWorkDay ? 7 * 60 + 30 : 9 * 60),
      end: Math.min(daySleepCutoff, workStartMinutes ?? 12 * 60 + 30)
    },
    afternoon: {
      label: "afternoon" as const,
      start: Math.max(wakeMinutes, isWorkDay ? fallbackWorkEnd + 30 : 14 * 60),
      end: Math.min(daySleepCutoff, isWorkDay ? 19 * 60 + 30 : 18 * 60 + 30)
    },
    evening: {
      label: "evening" as const,
      start: Math.max(wakeMinutes, isWorkDay ? fallbackWorkEnd + 120 : 19 * 60),
      end: daySleepCutoff
    }
  };

  const orderedWindows = [preferredFocusWindow, "afternoon", "evening", "morning"].filter(
    (window, index, current) => current.indexOf(window) === index
  ) as DerivedFeatures["preferredFocusWindow"][];

  const candidateSlots = orderedWindows.flatMap((window) => {
    const candidateWindow = baseWindows[window];
    const slots: Array<{
      start: number;
      label: DerivedFeatures["preferredFocusWindow"];
    }> = [];

    for (
      let start = candidateWindow.start;
      start + duration <= candidateWindow.end;
      start += duration + 30
    ) {
      slots.push({
        start,
        label: candidateWindow.label
      });
    }

    return slots;
  });

  return candidateSlots;
}

function createGoalDecisions(
  goals: GoalInput[],
  focusMinutes: number,
  preferredFocusWindow: DerivedFeatures["preferredFocusWindow"]
): PlannerDecision[] {
  const duration = clampMinutes(focusMinutes, 30, 120);

  return goals
    .filter((goal) => goal.name.trim().length > 0)
    .sort((left, right) => right.priority - left.priority)
    .map((goal) => ({
      step: "allocation",
      impact: "decision" as const,
      title: `Allocazione per ${goal.name}`,
      detail: `Priorita' ${goal.priority}/5, circa ${Math.ceil(
        goal.desiredWeeklyMinutes / duration
      )} blocchi da ${duration} minuti nella fascia ${preferredFocusWindow}.`
    }));
}

// Assegna un blocco focus al giorno scegliendo i goal in ordine di priorita'.
function createGoalBlocks(profile: UserProfile, focusMinutes: number) {
  const goals = profile.goals.filter((goal) => goal.name.trim().length > 0);

  if (goals.length === 0) {
    return [];
  }

  const preferredFocusWindow = getPreferredFocusWindow(profile);
  const rankedGoals = [...goals].sort((a, b) => b.priority - a.priority);
  const duration = clampMinutes(focusMinutes, 30, 120);
  const blocksByDay = weekdays.reduce<Record<Weekday, number>>((acc, day) => {
    acc[day] = 0;
    return acc;
  }, {} as Record<Weekday, number>);
  let dayCursor = 0;

  return rankedGoals.flatMap((goal) => {
    const blockCount = Math.max(1, Math.ceil(goal.desiredWeeklyMinutes / duration));

    return Array.from({ length: blockCount }, (_, blockIndex) => {
      const day = weekdays[dayCursor % weekdays.length];
      const slotIndex = blocksByDay[day];
      const candidateSlots = getFocusStartMinutes(
        profile,
        day,
        profile.fixedCommitments[0]?.days ?? [],
        preferredFocusWindow,
        duration
      );
      const selectedSlot = candidateSlots[slotIndex] ?? {
        start:
          candidateSlots[candidateSlots.length - 1]?.start + (duration + 30) ||
          (profile.fixedCommitments[0]?.days.includes(day) ? 18 * 60 + 30 : 19 * 60),
        label: preferredFocusWindow
      };
      const startMinutes = selectedSlot.start;

      blocksByDay[day] += 1;
      dayCursor += 1;

      return {
        id: `${day}-${goal.name}-focus-${blockIndex}`,
        day,
        start: toTime(startMinutes),
        end: toTime(startMinutes + duration),
        title: goal.name,
        kind: "focus" as const,
        color: pickFocusColor(goal.priority),
        rationale: `Blocco assegnato a ${goal.name} nella fascia ${selectedSlot.label} per coprire circa ${goal.desiredWeeklyMinutes} minuti a settimana.`
      };
    });
  });
}

// Se il piano non e' rigido, lascia alcuni spazi cuscinetto per gli imprevisti.
function createBuffers(profile: UserProfile): WeeklyPlan["blocks"] {
  if (profile.flexibilityMode === "rigid") {
    return [];
  }

  const bufferDays = profile.flexibilityMode === "flexible"
    ? ["tue", "wed", "sat"]
    : ["wed", "sat"];

  return bufferDays.map((day) => ({
    id: `${day}-buffer`,
    day: day as Weekday,
    start: day === "wed" ? "21:00" : "15:00",
    end: day === "wed" ? "21:30" : "15:30",
    title: "Buffer",
    kind: "buffer" as const,
    color: "#b8c57a",
    rationale: "Spazio lasciato libero per assorbire imprevisti."
  }));
}

export function deriveFeatures(
  raw: RawAnswers,
  profile: UserProfile,
  capacityCheck: PlanCapacityCheck
): DerivedFeatures {
  const focusBlockMinutes = clampMinutes(raw.focusMinutes, 30, 120);
  const estimatedFocusBlocks = Math.max(
    1,
    Math.ceil(capacityCheck.totalGoalMinutes / focusBlockMinutes)
  );

  return {
    sleepMinutesPerDay: getDurationMinutes(raw.sleep, raw.wake),
    workMinutesPerWorkDay: getDurationMinutes(raw.workStart, raw.workEnd),
    totalGoalMinutes: capacityCheck.totalGoalMinutes,
    weeklyCapacityMinutes: capacityCheck.weeklyCapacityMinutes,
    remainingWeeklyMinutes: capacityCheck.remainingWeeklyMinutes,
    focusBlockMinutes,
    estimatedFocusBlocks,
    preferredFocusWindow: getPreferredFocusWindow(profile),
    workloadLevel: getWorkloadLevel(
      capacityCheck.remainingWeeklyMinutes,
      capacityCheck.weeklyCapacityMinutes
    )
  };
}

function buildPlannerDecisions(
  raw: RawAnswers,
  profile: UserProfile,
  capacityCheck: PlanCapacityCheck,
  derivedFeatures: DerivedFeatures
): PlannerDecision[] {
  const decisions: PlannerDecision[] = [
    {
      step: "normalize",
      impact: "info",
      title: "Profilo normalizzato",
      detail: `${profile.goals.filter((goal) => goal.name.trim().length > 0).length} goal attivi, ${
        profile.fixedCommitments.length
      } impegno fisso e slot base da ${profile.slotSizeMinutes} minuti.`
    },
    {
      step: "capacity",
      impact: capacityCheck.isCompatible ? "info" : "warning",
      title: capacityCheck.isCompatible ? "Capacita' compatibile" : "Capacita' critica",
      detail: capacityCheck.isCompatible
        ? `Restano ${Math.floor(capacityCheck.remainingWeeklyMinutes / 60)}h ${
            capacityCheck.remainingWeeklyMinutes % 60
          }m su ${Math.floor(capacityCheck.weeklyCapacityMinutes / 60)}h utili.`
        : capacityCheck.weeklyIssue ??
          "Lavoro, sonno e obiettivi richiesti non rientrano nel tempo disponibile."
    },
    {
      step: "allocation",
      impact: "decision",
      title: "Finestra focus preferita",
      detail: `Il motore privilegia la fascia ${derivedFeatures.preferredFocusWindow} perche' il profilo energia la rende piu' affidabile.`
    },
    {
      step: "buffer",
      impact: raw.flexibilityMode === "rigid" ? "warning" : "decision",
      title:
        raw.flexibilityMode === "rigid"
          ? "Nessun buffer automatico"
          : "Buffer automatici inseriti",
      detail:
        raw.flexibilityMode === "rigid"
          ? "Modalita' rigida: ogni minuto libero viene spinto verso gli obiettivi."
          : raw.flexibilityMode === "flexible"
            ? "Modalita' flessibile: il motore inserisce piu' spazi cuscinetto per assorbire variazioni."
            : "Modalita' mista: il motore lascia pochi buffer per non irrigidire troppo la settimana."
    }
  ];

  return [...decisions, ...createGoalDecisions(profile.goals, raw.focusMinutes, derivedFeatures.preferredFocusWindow)];
}

// Orchestratore del prototipo: normalizza le risposte e costruisce il piano finale.
export function buildPrototypePlan(raw: RawAnswers): PlannerResult {
  const profile = normalizeAnswers(raw);
  const capacityCheck = checkPlanCapacity(raw);
  const derivedFeatures = deriveFeatures(raw, profile, capacityCheck);
  const blocks = [
    ...blocksForCommitments(profile),
    ...createGoalBlocks(profile, raw.focusMinutes),
    ...createBuffers(profile)
  ];

  return {
    profile,
    capacityCheck,
    derivedFeatures,
    decisions: buildPlannerDecisions(raw, profile, capacityCheck, derivedFeatures),
    plan: {
      blocks,
      summary: [
        "Gli impegni fissi vengono bloccati per primi.",
        `I goal piu' importanti vengono spinti verso la fascia ${derivedFeatures.preferredFocusWindow}.`,
        `Livello carico rilevato: ${derivedFeatures.workloadLevel}.`
      ]
    }
  };
}
