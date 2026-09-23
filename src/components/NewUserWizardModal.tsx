import { useMemo, useState } from "react";
import type { FixedScheduleDraft, NewUserWizardDraft, NewUserWizardModalProps, NewUserWizardSubmission, PlanPreviewOption } from "../model/NewUserWizardModal.js";
import type { FixedCommitment, GoalInput, RawAnswers, Weekday } from "../model/planning.js";
import { newUserWizardSteps } from "../onboarding/newUserWizardSteps";
import { createEmptyGoal, defaultAnswers, formatWeeklyGoalDuration, goalPriorityOptions, weekdayLabels, weeklyGoalDurationOptions } from "../planner/defaults";
import { formatTimeRange } from "../utils/time";
export type { NewUserWizardSubmission } from "../model/NewUserWizardModal.js";

const planDurationOptions: Array<{
  value: NewUserWizardDraft["planDuration"];
  title: string;
  description: string;
}> = [
  {
    value: "weekly",
    title: "1 settimana",
    description:
      "Il dettaglio resta molto concreto e adatto a una griglia operativa.",
  },
  {
    value: "monthly",
    title: "1 mese",
    description:
      "Utile se vuoi un piano che copra il ritmo medio delle prossime settimane.",
  },
  {
    value: "quarterly",
    title: "3 mesi",
    description:
      "Adatto quando vuoi distribuire obiettivi importanti su un trimestre.",
  },
  {
    value: "semiannual",
    title: "6 mesi",
    description:
      "Buono per percorsi di crescita o cambi di routine piu' lenti.",
  },
  {
    value: "annual",
    title: "1 anno",
    description:
      "Serve per dare una direzione lunga, non per riempire tutto il calendario.",
  },
];

const sleepHoursOptions = [6, 7, 8, 9];
const focusBlockOptions = [30, 60, 90, 120];
const energyOptions: Array<{
  value: keyof RawAnswers["energyProfile"];
  label: string;
}> = [
  { value: "morning", label: "Mattina" },
  { value: "afternoon", label: "Pomeriggio" },
  { value: "evening", label: "Sera" },
];
const workStyleOptions: Array<{
  value: NewUserWizardDraft["workStyle"];
  title: string;
  description: string;
}> = [
  {
    value: "deep_work",
    title: "Una cosa per volta",
    description: "Preferisci sessioni piu' profonde e meno cambi di contesto.",
  },
  {
    value: "alternating",
    title: "Alternanza",
    description:
      "Ti trovi bene a distribuire attivita' diverse nella stessa giornata.",
  },
  {
    value: "short_sprints",
    title: "Sessioni brevi",
    description: "Rendi meglio con blocchi piu' corti e frequenti.",
  },
];
const flexibilityOptions: Array<{
  value: NewUserWizardDraft["flexibilityMode"];
  title: string;
  description: string;
}> = [
  {
    value: "rigid",
    title: "Rigido",
    description: "Pochi spazi vuoti, calendario piu' serrato e difeso.",
  },
  {
    value: "mixed",
    title: "Misto",
    description: "Buon equilibrio tra struttura e margine per adattarsi.",
  },
  {
    value: "flexible",
    title: "Flessibile",
    description: "Più buffer e più spazio per assorbire cambiamenti.",
  },
];
const planIntensityOptions: Array<{
  value: NewUserWizardDraft["planIntensity"];
  title: string;
  description: string;
}> = [
  {
    value: "light",
    title: "Leggero",
    description: "Meglio meno carico e piu' margine per recuperare.",
  },
  {
    value: "balanced",
    title: "Equilibrato",
    description: "Distribuzione sostenibile senza riempire ogni spazio.",
  },
  {
    value: "push",
    title: "Spinto",
    description: "Vuoi usare molto del tempo disponibile per avanzare.",
  },
];
const difficultyOptions: Array<{
  value: NewUserWizardDraft["mainDifficulties"][number];
  title: string;
}> = [
  { value: "procrastination", title: "Procrastinazione" },
  { value: "overload", title: "Sovraccarico" },
  { value: "context_switching", title: "Troppi cambi di contesto" },
  { value: "unexpected_events", title: "Imprevisti frequenti" },
];

function buildPreviewOptions(
  draft: NewUserWizardDraft,
  helpers: {
    flexibilityLabel: string;
    dominantEnergyWindow: string;
    selectedDifficultyLabels: string[];
  },
): PlanPreviewOption[] {
  const activeGoalCount = draft.goals.filter(
    (goal) => goal.name.trim().length > 0,
  ).length;
  const protectedCount = draft.protectedSchedules.filter(
    (schedule) => schedule.title.trim().length > 0 && schedule.days.length > 0,
  ).length;
  const constraintsLabel =
    protectedCount > 0
      ? `${protectedCount} spazi protetti`
      : "pochi vincoli sul tempo libero";
  const difficultyNote =
    helpers.selectedDifficultyLabels.length > 0
      ? helpers.selectedDifficultyLabels.join(", ")
      : "nessuna criticita' segnata";
  const focusSlotIndex =
    helpers.dominantEnergyWindow === "pomeriggio"
      ? 1
      : helpers.dominantEnergyWindow === "sera"
        ? 2
        : 0;

  function createDaySlots(
    emphasis: "balanced" | "deep" | "flex" | "push",
    dayIndex: number,
  ): Array<"focus" | "support" | "buffer" | "free"> {
    const isWeekend = dayIndex >= 5;
    const slots: Array<"focus" | "support" | "buffer" | "free"> = [
      "support",
      "support",
      "buffer",
    ];

    if (isWeekend) {
      if (emphasis === "push" && dayIndex === 5) {
        return ["focus", "support", "buffer"];
      }

      if (emphasis === "balanced" && dayIndex === 5) {
        return ["support", "buffer", "free"];
      }

      return ["free", "free", "buffer"];
    }

    if (emphasis === "deep") {
      slots[focusSlotIndex] = "focus";
      slots[(focusSlotIndex + 1) % 3] = dayIndex % 2 === 0 ? "focus" : "support";
      slots[(focusSlotIndex + 2) % 3] = "buffer";
      return slots;
    }

    if (emphasis === "flex") {
      slots[focusSlotIndex] = "focus";
      slots[(focusSlotIndex + 1) % 3] = "buffer";
      slots[(focusSlotIndex + 2) % 3] = dayIndex === 2 ? "free" : "support";
      return slots;
    }

    if (emphasis === "push") {
      slots[focusSlotIndex] = "focus";
      slots[(focusSlotIndex + 1) % 3] = "focus";
      slots[(focusSlotIndex + 2) % 3] = "support";
      return slots;
    }

    slots[focusSlotIndex] = "focus";
    slots[(focusSlotIndex + 1) % 3] = dayIndex === 2 ? "buffer" : "support";
    slots[(focusSlotIndex + 2) % 3] = "buffer";
    return slots;
  }

  function createWeekPreview(
    emphasis: "balanced" | "deep" | "flex" | "push",
  ): PlanPreviewOption["weekPreview"] {
    return weekdayLabels.map((day, dayIndex) => ({
      day: day.label,
      slots: createDaySlots(emphasis, dayIndex),
    }));
  }

  return [
    {
      id: "balanced-anchor",
      title: "Equilibrato",
      summary: "Settimana regolare, con carico stabile e margine distribuito.",
      focusLabel: `${draft.focusBlockMinutes} min`,
      bufferLabel: "Buffer medi",
      description: `Tiene insieme ${activeGoalCount} obiettivi senza stringere troppo la settimana. Buono se vuoi una base ordinata con ${constraintsLabel}.`,
      weekPreview: createWeekPreview("balanced"),
    },
    {
      id: "deep-focus",
      title: "Focus protetto",
      summary: "Meno cambi di contesto, blocchi importanti piu' difesi.",
      focusLabel: `${Math.max(draft.focusBlockMinutes, 60)} min`,
      bufferLabel: "Pochi buffer",
      description: `Spinge le priorita' nelle fasce in cui rendi meglio, soprattutto in ${helpers.dominantEnergyWindow}. Ha senso se vuoi giornate piu' concentrate e meno dispersione.`,
      weekPreview: createWeekPreview("deep"),
    },
    {
      id: "flex-recovery",
      title: "Flessibile",
      summary: "Piano piu' morbido, con piu' spazio per assorbire cambiamenti.",
      focusLabel: `${Math.min(draft.focusBlockMinutes, 60)} min`,
      bufferLabel: "Buffer alti",
      description: `Lascia piu' aria tra i blocchi ed e' la proposta piu' prudente se temi ${difficultyNote}. Riduce la pressione e rende il piano piu' realistico.`,
      weekPreview: createWeekPreview("flex"),
    },
    {
      id: "push-sprint",
      title: "Sprint",
      summary: "Settimana piu' piena, costruita per spingere sui risultati.",
      focusLabel: `${draft.focusBlockMinutes} min`,
      bufferLabel: "Margine basso",
      description: `E' la proposta piu' intensa: occupa piu' tempo disponibile e sacrifica parte del margine. Funziona se vuoi accelerare davvero e accetti una settimana piu' densa.`,
      weekPreview: createWeekPreview("push"),
    },
  ];
}

function createFixedScheduleDraft(
  partial?: Partial<FixedScheduleDraft>,
): FixedScheduleDraft {
  return {
    id:
      partial?.id ??
      `fixed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: partial?.title ?? "",
    start: partial?.start ?? "09:00",
    end: partial?.end ?? "18:00",
    days: partial?.days ?? [],
  };
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildWizardSubmission(
  draft: NewUserWizardDraft,
  selectedPreview: PlanPreviewOption,
  dominantEnergyWindow: "mattina" | "pomeriggio" | "sera",
): NewUserWizardSubmission {
  const activeGoals = draft.goals.filter((goal) => goal.name.trim().length > 0);
  const activeFixedSchedules = draft.fixedSchedules.filter(
    (schedule) =>
      schedule.title.trim().length > 0 && schedule.days.length > 0,
  );
  const mainWorkSchedule =
    activeFixedSchedules.find((schedule) =>
      schedule.title.toLowerCase().includes("lavor"),
    ) ?? activeFixedSchedules[0];
  const wakeByEnergy = {
    mattina: "07:00",
    pomeriggio: "07:30",
    sera: "08:30",
  } as const;
  const wake = wakeByEnergy[dominantEnergyWindow] ?? defaultAnswers.wake;
  const sleep = toTime(toMinutes(wake) - draft.sleepHoursTarget * 60);
  const toCommitment = (schedule: FixedScheduleDraft): FixedCommitment => ({
    title: schedule.title.trim(),
    start: schedule.start,
    end: schedule.end,
    days: schedule.days,
  });
  const baseAnswers: RawAnswers = {
    goals: activeGoals.length > 0 ? activeGoals : defaultAnswers.goals,
    workStart: mainWorkSchedule?.start ?? defaultAnswers.workStart,
    workEnd: mainWorkSchedule?.end ?? defaultAnswers.workEnd,
    workDays: mainWorkSchedule?.days ?? defaultAnswers.workDays,
    wake,
    sleep,
    focusMinutes: draft.focusBlockMinutes,
    flexibilityMode: draft.flexibilityMode,
    energyProfile: draft.energyProfile,
    planningHorizon: draft.planDuration,
    fixedCommitments: activeFixedSchedules.map(toCommitment),
    protectedTime: draft.protectedSchedules
      .filter((schedule) => schedule.title.trim().length > 0 && schedule.days.length > 0)
      .map(toCommitment),
    workStyle: draft.workStyle,
    planIntensity: draft.planIntensity,
    mainDifficulties: draft.mainDifficulties,
    selectedPreviewId: selectedPreview.id,
  };

  const previewAdjustedAnswers: RawAnswers =
    selectedPreview.id === "deep-focus"
      ? {
          ...baseAnswers,
          focusMinutes: Math.max(baseAnswers.focusMinutes, 90),
          flexibilityMode: "rigid",
        }
      : selectedPreview.id === "flex-recovery"
        ? {
            ...baseAnswers,
            focusMinutes: Math.min(baseAnswers.focusMinutes, 60),
            flexibilityMode: "flexible",
          }
        : selectedPreview.id === "push-sprint"
          ? {
              ...baseAnswers,
              focusMinutes: Math.max(baseAnswers.focusMinutes, 90),
              flexibilityMode: "rigid",
            }
          : baseAnswers;

  return {
    answers: previewAdjustedAnswers,
    selectedPlan: {
      id: selectedPreview.id,
      title: selectedPreview.title,
      description: selectedPreview.description,
    },
  };
}

export function NewUserWizardModal({
  onClose,
  onSubmit,
}: NewUserWizardModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draft, setDraft] = useState<NewUserWizardDraft>({
    goals: defaultAnswers.goals.map((goal) => ({ ...goal })),
    planDuration: "weekly",
    fixedSchedules: [
      createFixedScheduleDraft({
        title: "Lavoro",
        start: defaultAnswers.workStart,
        end: defaultAnswers.workEnd,
        days: [...defaultAnswers.workDays],
      }),
    ],
    protectedSchedules: [],
    sleepHoursTarget: 8,
    energyProfile: { ...defaultAnswers.energyProfile },
    focusBlockMinutes: defaultAnswers.focusMinutes,
    workStyle: "deep_work",
    flexibilityMode: defaultAnswers.flexibilityMode,
    planIntensity: "balanced",
    mainDifficulties: [],
    selectedPreviewId: undefined,
  });
  const currentStep = newUserWizardSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === newUserWizardSteps.length - 1;
  const progressPercentage =
    ((currentStepIndex + 1) / newUserWizardSteps.length) * 100;
  const activeGoals = useMemo(
    () => draft.goals.filter((goal) => goal.name.trim().length > 0),
    [draft.goals],
  );
  const totalGoalHours = useMemo(() => {
    const totalMinutes = activeGoals.reduce(
      (total, goal) => total + goal.desiredWeeklyMinutes,
      0,
    );

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }, [activeGoals]);
  const activeFixedSchedules = useMemo(
    () =>
      draft.fixedSchedules.filter(
        (schedule) =>
          schedule.title.trim().length > 0 && schedule.days.length > 0,
      ),
    [draft.fixedSchedules],
  );
  const activeProtectedSchedules = useMemo(
    () =>
      draft.protectedSchedules.filter(
        (schedule) =>
          schedule.title.trim().length > 0 && schedule.days.length > 0,
      ),
    [draft.protectedSchedules],
  );
  const dominantEnergyWindow = useMemo(() => {
    const scoreByEnergy = {
      low: 1,
      medium: 2,
      high: 3,
    };
    const rankedWindows = [
      { key: "mattina" as const, value: draft.energyProfile.morning },
      { key: "pomeriggio" as const, value: draft.energyProfile.afternoon },
      { key: "sera" as const, value: draft.energyProfile.evening },
    ].sort(
      (left, right) => scoreByEnergy[right.value] - scoreByEnergy[left.value],
    );

    return rankedWindows[0]?.key ?? "mattina";
  }, [draft.energyProfile]);
  const selectedDifficultyLabels = useMemo(
    () =>
      difficultyOptions
        .filter((option) => draft.mainDifficulties.includes(option.value))
        .map((option) => option.title),
    [draft.mainDifficulties],
  );
  const selectedFlexibilityLabel =
    flexibilityOptions.find((option) => option.value === draft.flexibilityMode)
      ?.title ?? draft.flexibilityMode;
  const selectedPlanIntensityLabel =
    planIntensityOptions.find((option) => option.value === draft.planIntensity)
      ?.title ?? draft.planIntensity;
  const previewOptions = useMemo(
    () =>
      buildPreviewOptions(draft, {
        flexibilityLabel: selectedFlexibilityLabel,
        dominantEnergyWindow,
        selectedDifficultyLabels,
      }),
    [draft, selectedFlexibilityLabel, dominantEnergyWindow, selectedDifficultyLabels],
  );
  const selectedPreview = previewOptions.find(
    (option) => option.id === draft.selectedPreviewId,
  );
  const isCurrentStepValid =
    (currentStep.id !== "goals" || activeGoals.length > 0) &&
    (currentStep.id !== "preview" || Boolean(draft.selectedPreviewId));
  const isPreviewStep = currentStep.id === "preview";
  type ScheduleCollectionKey = "fixedSchedules" | "protectedSchedules";

  function updateGoal(index: number, partial: Partial<GoalInput>) {
    setDraft((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...partial } : goal,
      ),
    }));
  }

  function addGoal() {
    setDraft((current) => ({
      ...current,
      goals: [...current.goals, createEmptyGoal()],
    }));
  }

  function removeGoal(index: number) {
    setDraft((current) => ({
      ...current,
      goals:
        current.goals.length === 1
          ? [createEmptyGoal()]
          : current.goals.filter((_, goalIndex) => goalIndex !== index),
    }));
  }

  function toggleDifficulty(
    difficulty: NewUserWizardDraft["mainDifficulties"][number],
  ) {
    setDraft((current) => ({
      ...current,
      mainDifficulties: current.mainDifficulties.includes(difficulty)
        ? current.mainDifficulties.filter(
            (currentDifficulty) => currentDifficulty !== difficulty,
          )
        : [...current.mainDifficulties, difficulty],
    }));
  }

  function updateFixedSchedule(
    collection: ScheduleCollectionKey,
    scheduleId: string,
    partial: Partial<FixedScheduleDraft>,
  ) {
    setDraft((current) => {
      return {
        ...current,
        [collection]: current[collection].map((schedule) =>
          schedule.id === scheduleId ? { ...schedule, ...partial } : schedule,
        ),
      };
    });
  }

  function toggleFixedScheduleDay(
    collection: ScheduleCollectionKey,
    scheduleId: string,
    day: Weekday,
  ) {
    setDraft((current) => ({
      ...current,
      [collection]: current[collection].map((schedule) => {
        if (schedule.id !== scheduleId) {
          return schedule;
        }

        const nextDays = schedule.days.includes(day)
          ? schedule.days.filter((currentDay) => currentDay !== day)
          : [...schedule.days, day];

        return {
          ...schedule,
          days: nextDays,
        };
      }),
    }));
  }

  function addFixedSchedule(
    collection: ScheduleCollectionKey,
    partial?: Partial<FixedScheduleDraft>,
  ) {
    setDraft((current) => ({
      ...current,
      [collection]: [
        ...current[collection],
        createFixedScheduleDraft(
          partial ?? {
            title: "",
            start: "08:00",
            end: "09:00",
          },
        ),
      ],
    }));
  }

  function removeFixedSchedule(
    collection: ScheduleCollectionKey,
    scheduleId: string,
  ) {
    setDraft((current) => ({
      ...current,
      [collection]:
        collection === "fixedSchedules" && current[collection].length === 1
          ? [createFixedScheduleDraft()]
          : current[collection].filter(
              (schedule) => schedule.id !== scheduleId,
            ),
    }));
  }

  function renderScheduleTable(
    collection: ScheduleCollectionKey,
    options: {
      title: string;
      description: string;
      addButtonLabel: string;
      firstPlaceholder: string;
      otherPlaceholder: string;
    },
  ) {
    const schedules = draft[collection];

    return (
      <section className="form-section wizard-nested-section">
        <div className="form-section-header">
          <h4>{options.title}</h4>
          <p>{options.description}</p>
        </div>

        <div className="fixed-schedule-table">
          {schedules.length > 0 ? (
            <div className="fixed-schedule-table-body">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="fixed-schedule-row">
                  <div className="fixed-schedule-cell fixed-schedule-cell-title">
                    <label className="fixed-schedule-inline-label">
                      <span className="fixed-schedule-mobile-label">Voce</span>
                      <input
                        value={schedule.title}
                        placeholder={
                          index === 0
                            ? options.firstPlaceholder
                            : options.otherPlaceholder
                        }
                        onChange={(event) =>
                          updateFixedSchedule(collection, schedule.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="fixed-schedule-cell fixed-schedule-cell-time">
                    <label className="fixed-schedule-inline-label">
                      <span className="fixed-schedule-mobile-label">
                        Orario
                      </span>
                      <div className="fixed-schedule-time-range">
                        <input
                          type="time"
                          value={schedule.start}
                          onChange={(event) =>
                            updateFixedSchedule(collection, schedule.id, {
                              start: event.target.value,
                            })
                          }
                        />
                        <span>→</span>
                        <input
                          type="time"
                          value={schedule.end}
                          onChange={(event) =>
                            updateFixedSchedule(collection, schedule.id, {
                              end: event.target.value,
                            })
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <div className="fixed-schedule-cell fixed-schedule-cell-days">
                    <span className="fixed-schedule-mobile-label">Giorni</span>
                    <div className="weekday-checkbox-grid weekday-checkbox-grid-compact">
                      {weekdayLabels.map((day) => {
                        const isActive = schedule.days.includes(day.key);

                        return (
                          <label
                            key={`${schedule.id}-${day.key}`}
                            className={`weekday-checkbox ${
                              isActive ? "weekday-checkbox-active" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() =>
                                toggleFixedScheduleDay(
                                  collection,
                                  schedule.id,
                                  day.key,
                                )
                              }
                            />
                            <span>{day.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="fixed-schedule-cell fixed-schedule-cell-actions">
                    <button
                      type="button"
                      className="goal-remove-button"
                      onClick={() =>
                        removeFixedSchedule(collection, schedule.id)
                      }
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="goal-add-button fixed-schedule-add-button"
          onClick={() =>
            addFixedSchedule(collection, {
              title: "",
              start: "08:00",
              end: "09:00",
            })
          }
        >
          {options.addButtonLabel}
        </button>
      </section>
    );
  }

  function renderCurrentStepContent() {
    if (currentStep.id === "non-negotiables") {
      return (
        <div className="wizard-step-content">
          {renderScheduleTable("fixedSchedules", {
            title: "Elenco orari fissi",
            description:
              "Inserisci qui tutto cio' che si ripete in giorni e orari abbastanza stabili: lavoro, medicine, appuntamenti o altre routine fisse.",
            addButtonLabel: "+ Aggiungi orario fisso",
            firstPlaceholder: "Es. Lavoro",
            otherPlaceholder: "Es. Medicina",
          })}
        </div>
      );
    }

    if (currentStep.id === "time-structure") {
      return (
        <div className="wizard-step-content">
          {renderScheduleTable("protectedSchedules", {
            title: "Tempo che vuoi proteggere",
            description:
              "Usa la stessa logica degli orari fissi, ma per il tempo che vuoi tenere libero: sonno, mezze giornate protette o fasce che il piano non deve occupare.",
            addButtonLabel: "+ Aggiungi tempo libero",
            firstPlaceholder: "Es. Sonno",
            otherPlaceholder: "Es. Mercoledi pomeriggio",
          })}
        </div>
      );
    }

    if (currentStep.id === "rhythm") {
      return (
        <div className="wizard-step-content">
          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Quanto dormi?</h4>
              <p>
                Non ti chiediamo orari precisi in questa fase: ci basta sapere
                quante ore vuoi lasciare libere per dormire con continuita'.
              </p>
            </div>

            <div className="wizard-choice-row wizard-choice-row-compact">
              {sleepHoursOptions.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  className={`wizard-choice-card ${
                    draft.sleepHoursTarget === hours
                      ? "wizard-choice-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      sleepHoursTarget: hours,
                    }))
                  }
                >
                  <strong>{hours} ore</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Energia nella giornata</h4>
              <p>
                Questo aiuta il planner a capire dove mettere le attivita' piu'
                impegnative e dove alleggerire il carico.
              </p>
            </div>

            <div className="wizard-energy-grid">
              {energyOptions.map((energyOption) => (
                <label key={energyOption.value}>
                  {energyOption.label}
                  <select
                    value={draft.energyProfile[energyOption.value]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        energyProfile: {
                          ...current.energyProfile,
                          [energyOption.value]: event.target
                            .value as RawAnswers["energyProfile"]["morning"],
                        },
                      }))
                    }
                  >
                    <option value="low">Bassa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Come preferisci lavorare</h4>
              <p>
                Questo ci serve per capire che forma deve avere il piano: blocchi
                piu' lunghi e concentrati, giornate piu' varie oppure sessioni brevi
                e frequenti.
              </p>
            </div>

            <div className="form-row form-row-two-columns">
              <label>
                Quanto dovrebbe durare, di base, un blocco di lavoro concentrato?
                <select
                  value={draft.focusBlockMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      focusBlockMinutes: Number(event.target.value),
                    }))
                  }
                >
                  {focusBlockOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minuti
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wizard-choice-row">
              {workStyleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`wizard-choice-card ${
                    draft.workStyle === option.value
                      ? "wizard-choice-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      workStyle: option.value,
                    }))
                  }
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (currentStep.id === "style") {
      return (
        <div className="wizard-step-content">
          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Quanto margine vuoi lasciare agli imprevisti?</h4>
              <p>
                Questa scelta ci aiuta a capire se il piano deve essere piu'
                serrato o se deve lasciare piu' spazio di recupero.
              </p>
            </div>

            <div className="wizard-choice-row">
              {flexibilityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`wizard-choice-card ${
                    draft.flexibilityMode === option.value
                      ? "wizard-choice-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      flexibilityMode: option.value,
                    }))
                  }
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Quanto pieno vuoi che sia il piano?</h4>
              <p>
                Non stiamo ancora riempiendo il calendario: qui ci dici il tono
                generale che preferisci per la settimana.
              </p>
            </div>

            <div className="wizard-choice-row">
              {planIntensityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`wizard-choice-card ${
                    draft.planIntensity === option.value
                      ? "wizard-choice-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      planIntensity: option.value,
                    }))
                  }
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Cosa tende a farti saltare il piano?</h4>
              <p>
                Seleziona solo quello che ti succede davvero. Useremo queste
                informazioni per rendere il piano piu' realistico.
              </p>
            </div>

            <div className="wizard-chip-grid">
              {difficultyOptions.map((option) => {
                const isActive = draft.mainDifficulties.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`wizard-chip-button ${
                      isActive ? "wizard-chip-button-active" : ""
                    }`}
                    onClick={() => toggleDifficulty(option.value)}
                  >
                    {option.title}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      );
    }

    if (currentStep.id === "preview") {
      return (
        <div className="wizard-step-content">
          <section className="form-section wizard-nested-section">
            <div className="form-section-header">
              <h4>Scegli il piano in cui ti riconosci di piu'</h4>
              <p>
                Queste 4 anteprime partono dai dati che hai inserito, ma mettono
                l'accento su modi diversi di vivere la settimana.
              </p>
            </div>

            <div className="preview-legend" aria-hidden="true">
              <span className="preview-legend-item">
                <span className="preview-legend-dot preview-slot-focus" />
                Focus
              </span>
              <span className="preview-legend-item">
                <span className="preview-legend-dot preview-slot-support" />
                Supporto
              </span>
              <span className="preview-legend-item">
                <span className="preview-legend-dot preview-slot-buffer" />
                Buffer
              </span>
              <span className="preview-legend-item">
                <span className="preview-legend-dot preview-slot-free" />
                Libero
              </span>
            </div>

            <div className="preview-grid">
              {previewOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`preview-card ${
                    draft.selectedPreviewId === option.id
                      ? "preview-card-active"
                      : ""
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      selectedPreviewId: option.id,
                    }))
                  }
                >
                  <div className="preview-card-main">
                    <div className="preview-card-top">
                      <h4>{option.title}</h4>
                      <p className="preview-card-summary">{option.summary}</p>

                      <div className="preview-card-badges">
                        <span className="preview-card-badge">
                          Focus {option.focusLabel}
                        </span>
                        <span className="preview-card-badge">
                          {option.bufferLabel}
                        </span>
                      </div>
                    </div>

                    <div className="preview-week" aria-hidden="true">
                      {option.weekPreview.map((day) => (
                        <div key={`${option.id}-${day.day}`} className="preview-day">
                          <span className="preview-day-label">{day.day}</span>
                          <div className="preview-day-slots">
                            {day.slots.map((slot, slotIndex) => (
                              <span
                                key={`${option.id}-${day.day}-${slotIndex}`}
                                className={`preview-slot preview-slot-${slot}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="preview-card-description">{option.description}</p>
                </button>
              ))}
            </div>

            {!draft.selectedPreviewId ? (
              <div className="capacity-warning" role="alert">
                <h4>Seleziona una delle 4 anteprime</h4>
                <p>
                  Ci serve per capire quale piano ti rappresenta meglio prima di
                  passare ai feedback sulle singole celle.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      );
    }

    if (currentStep.id !== "goals") {
      return (
        <div className="wizard-checklist">
          {currentStep.plannedFields.map((field) => (
            <div key={field} className="wizard-checklist-item">
              <span className="wizard-bullet" />
              <p>{field}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="wizard-step-content">
        <section className="form-section wizard-nested-section">
          <div className="form-section-header">
            <h4>Quanto vuoi che duri il tuo piano?</h4>
            <p>
              Scegli l'orizzonte che senti piu' naturale. Il piano dettagliato
              del prototipo resta settimanale, ma useremo questa scelta per
              calibrare aspettative, carico e tipo di anteprime iniziali.
            </p>
          </div>

          <div className="wizard-choice-row">
            {planDurationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`wizard-choice-card ${
                  draft.planDuration === option.value
                    ? "wizard-choice-card-active"
                    : ""
                }`}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    planDuration: option.value,
                  }))
                }
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="form-section wizard-nested-section">
          <div className="form-section-header">
            <h4>Obiettivi da proteggere</h4>
            <p>
              Chiediamo solo tre segnali per ogni obiettivo: nome, importanza e
              tempo desiderato. Sono i dati minimi davvero utili al motore.
            </p>
          </div>

          <div className="goal-list">
            {draft.goals.map((goal, index) => (
              <div key={`wizard-goal-${index}`} className="goal-item">
                <div className="goal-item-header">
                  <span className="goal-item-index">Obiettivo {index + 1}</span>
                  <button
                    type="button"
                    className="goal-remove-button"
                    onClick={() => removeGoal(index)}
                  >
                    Rimuovi
                  </button>
                </div>

                <div className="form-row">
                  <label>
                    Nome obiettivo
                    <input
                      value={goal.name}
                      placeholder="Es. Studio AI"
                      onChange={(event) =>
                        updateGoal(index, { name: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="form-row form-row-goals">
                  <label>
                    Importanza
                    <select
                      value={goal.priority}
                      onChange={(event) =>
                        updateGoal(index, {
                          priority: Number(event.target.value),
                        })
                      }
                    >
                      {goalPriorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority} / 5
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Quanto tempo vuoi dedicarci ogni settimana
                    <select
                      value={goal.desiredWeeklyMinutes}
                      onChange={(event) =>
                        updateGoal(index, {
                          desiredWeeklyMinutes:
                            Number(event.target.value) || 30,
                        })
                      }
                    >
                      {weeklyGoalDurationOptions.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {formatWeeklyGoalDuration(minutes)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <button type="button" className="goal-add-button" onClick={addGoal}>
              + Aggiungi obiettivo
            </button>
          </div>
        </section>

        {!isCurrentStepValid ? (
          <div className="capacity-warning" role="alert">
            <h4>Serve almeno un obiettivo</h4>
            <p>
              Per andare avanti ci basta un solo obiettivo nominato. Il resto
              potremo aggiungerlo o rifinirlo dopo.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card wizard-modal-card">
        <div className="modal-header wizard-header">
          <div>
            <p className="eyebrow">Nuovo Utente</p>
            <h3>Wizard iniziale del profilo</h3>
            <p className="wizard-intro">
              Questa e' la struttura guida del primo onboarding. Ogni scheda e'
              gia' pronta per ospitare i campi reali nel prossimo passaggio.
            </p>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Chiudi
          </button>
        </div>

        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <div
              className="wizard-progress-value"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="wizard-stepper">
            {newUserWizardSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`wizard-step-chip ${
                  index === currentStepIndex
                    ? "wizard-step-chip-active"
                    : index < currentStepIndex
                      ? "wizard-step-chip-complete"
                      : ""
                }`}
                onClick={() => setCurrentStepIndex(index)}
              >
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`wizard-layout ${
            isPreviewStep ? "wizard-layout-single-column" : ""
          }`}
        >
          <section className="form-section wizard-main-card">
            <div className="form-section-header">
              <p className="eyebrow">{currentStep.eyebrow}</p>
              <h4>{currentStep.title}</h4>
              <p>{currentStep.description}</p>
              {isPreviewStep ? (
                <p className="wizard-step-guidance">{currentStep.userGuidance}</p>
              ) : null}
            </div>

            {isPreviewStep ? null : currentStep.id === "goals" ? (
              <div className="wizard-inline-summary">
                <div className="wizard-summary-chip">
                  <span>Goal attivi</span>
                  <strong>{activeGoals.length}</strong>
                </div>
                <div className="wizard-summary-chip">
                  <span>Tempo richiesto</span>
                  <strong>
                    {totalGoalHours.hours}h {totalGoalHours.minutes}m
                  </strong>
                </div>
              </div>
            ) : null}

            {renderCurrentStepContent()}
          </section>

          {!isPreviewStep ? (
            <aside className="form-section wizard-side-card">
              <div className="form-section-header">
                <h4>Cosa devi fare in questo step</h4>
                <p>{currentStep.userGuidance}</p>
              </div>

              {currentStep.id === "goals" ? (
                <div className="wizard-side-note">
                  <strong>Riepilogo rapido</strong>
                  <div className="wizard-inline-summary wizard-inline-summary-sidebar">
                    <div className="wizard-summary-chip">
                      <span>Goal attivi</span>
                      <strong>{activeGoals.length}</strong>
                    </div>
                    <div className="wizard-summary-chip">
                      <span>Tempo richiesto</span>
                      <strong>
                        {totalGoalHours.hours}h {totalGoalHours.minutes}m
                      </strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep.id === "non-negotiables" ? (
                <div className="wizard-side-note">
                  <strong>Riepilogo rapido</strong>
                  <p>
                    Hai impostato <strong>{activeFixedSchedules.length}</strong>{" "}
                    orari fissi. Il primo blocco attivo copre{" "}
                    <strong>
                      {activeFixedSchedules[0]
                        ? formatTimeRange(
                            activeFixedSchedules[0].start,
                            activeFixedSchedules[0].end,
                          )
                        : "nessuna fascia ancora definita"}
                    </strong>
                    .
                  </p>
                </div>
              ) : null}

              {currentStep.id === "time-structure" ? (
                <div className="wizard-side-note">
                  <strong>Riepilogo rapido</strong>
                  <p>
                    Hai protetto{" "}
                    <strong>{activeProtectedSchedules.length}</strong> fasce di
                    tempo. La prima voce attiva e'{" "}
                    <strong>
                      {activeProtectedSchedules[0]?.title || "ancora da definire"}
                    </strong>
                    .
                  </p>
                </div>
              ) : null}

              {currentStep.id === "rhythm" ? (
                <div className="wizard-side-note">
                  <strong>Riepilogo rapido</strong>
                  <p>
                    Vuoi proteggere <strong>{draft.sleepHoursTarget} ore</strong>{" "}
                    di sonno, la tua energia migliore sembra essere la{" "}
                    <strong>{dominantEnergyWindow}</strong> e preferisci blocchi
                    da <strong>{draft.focusBlockMinutes} minuti</strong>.
                  </p>
                </div>
              ) : null}

              {currentStep.id === "style" ? (
                <div className="wizard-side-note">
                  <strong>Riepilogo rapido</strong>
                  <p>
                    Vuoi un piano <strong>{selectedFlexibilityLabel}</strong>, con
                    tono <strong>{selectedPlanIntensityLabel}</strong>
                    {selectedDifficultyLabels.length > 0
                      ? ` e attenzione a ${selectedDifficultyLabels.join(", ")}.`
                      : "."}
                  </p>
                </div>
              ) : null}

              <div className="wizard-side-note">
                <strong>Che cosa raccogliamo</strong>
                <p>{currentStep.plannedFields.join(", ")}.</p>
              </div>
            </aside>
          ) : null}
        </div>

        <div className="modal-actions">
          <button
            className="ghost-button"
            onClick={() =>
              setCurrentStepIndex((current) => Math.max(0, current - 1))
            }
            disabled={isFirstStep}
          >
            Indietro
          </button>
          <div className="wizard-actions-right">
            <button className="ghost-button" onClick={onClose}>
              Salva per dopo
            </button>
            <button
              className="primary-button"
              onClick={() => {
                if (isLastStep) {
                  if (selectedPreview) {
                    onSubmit(
                      buildWizardSubmission(
                        draft,
                        selectedPreview,
                        dominantEnergyWindow,
                      ),
                    );
                  }
                  return;
                }

                setCurrentStepIndex((current) =>
                  Math.min(newUserWizardSteps.length - 1, current + 1),
                );
              }}
              disabled={!isCurrentStepValid}
            >
              {isLastStep ? "Avvia piano" : "Avanti"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
