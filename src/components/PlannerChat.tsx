import { FormEvent, useState } from "react";
import { applyPlanningIntentUpdate } from "../application/planningIntentReview";
import type { PlannerResult, RawAnswers, Weekday } from "../domain/planning";
import { interpretPlanningMessage } from "../infrastructure/localPlanningIntentGateway";
import { weekdayLabels } from "../planner/defaults";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  planning?: PlannerResult;
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    text: "Ciao! Raccontami cosa vuoi organizzare, cambiare o aggiungere al tuo piano.",
  },
];

interface PlannerChatProps {
  answers: RawAnswers | null;
  result: PlannerResult | null;
  onApplyAnswers: (answers: RawAnswers) => Promise<PlannerResult>;
}

export function PlannerChat({ answers, result, onApplyAnswers }: PlannerChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isThinking, setIsThinking] = useState(false);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isThinking) return;

    const messageId = Date.now();
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: messageId, role: "user", text },
    ]);
    setDraft("");
    setIsThinking(true);

    try {
      if (!answers) {
        throw new Error("Crea prima un profilo con “Nuovo utente”, poi chiedimi di modificarlo");
      }
      const interpreted = await interpretPlanningMessage(text);
      const application = applyPlanningIntentUpdate(answers, interpreted.intent, text);
      let assistantMessage: ChatMessage;

      if (application.changes.length > 0) {
        const updatedResult = await onApplyAnswers(application.answers);
        assistantMessage = {
          id: messageId + 1,
          role: "assistant",
          text: `${interpreted.runtime} ha applicato la richiesta:\n${application.changes.join("\n")}`,
          planning: updatedResult,
        };
      } else if (application.questions.length > 0) {
        assistantMessage = {
          id: messageId + 1,
          role: "assistant",
          text: application.questions[0],
        };
      } else {
        assistantMessage = {
          id: messageId + 1,
          role: "assistant",
          text: "Il modello ha letto il messaggio, ma non ha trovato una modifica applicabile agli obiettivi del piano.",
          planning: result ?? undefined,
        };
      }
      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: messageId + 1, role: "assistant", text: `Non riesco ad aggiornare il piano: ${detail}.` },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <section className="planner-chat" aria-labelledby="planner-chat-title">
      <div className="planner-chat-header">
        <div>
          <p className="eyebrow">Assistente locale</p>
          <h2 id="planner-chat-title">Parla con il planner</h2>
          <p>Descrivi un obiettivo, un impegno o una modifica al tuo piano.</p>
        </div>
        <span className={`planner-chat-status ${isThinking ? "is-loading" : ""}`}>
          {isThinking ? "Il modello sta elaborando…" : "Qwen3-4B Q4 · llama.cpp"}
        </span>
      </div>

      <div className="planner-chat-messages" aria-live="polite">
        {messages.map((message) => (
          <div
            className={`planner-chat-message planner-chat-message-${message.role}`}
            key={message.id}
          >
            <span>{message.role === "assistant" ? "Planner" : "Tu"}</span>
            <p>{message.text}</p>
            {message.planning ? <PlanningOutput result={message.planning} /> : null}
          </div>
        ))}
        {isThinking ? (
          <div className="planner-chat-message planner-chat-message-assistant planner-chat-thinking">
            <span>Planner</span>
            <p>Avvio di llama.cpp e analisi della richiesta…</p>
          </div>
        ) : null}
      </div>

      <form className="planner-chat-composer" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="planner-chat-input">
          Messaggio per il planner
        </label>
        <textarea
          id="planner-chat-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Es. Vorrei allenarmi tre volte a settimana dopo il lavoro…"
          rows={3}
          value={draft}
        />
        <div className="planner-chat-composer-footer">
          <small>Invio per mandare · Maiusc + Invio per andare a capo</small>
          <button className="primary-button" disabled={!draft.trim() || isThinking} type="submit">
            {isThinking ? "Elaborazione…" : "Invia"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PlanningOutput({ result }: { result: PlannerResult }) {
  const blocksByDay = result.plan.blocks.reduce<Partial<Record<Weekday, PlannerResult["plan"]["blocks"]>>>(
    (groups, block) => {
      groups[block.day] = [...(groups[block.day] ?? []), block];
      return groups;
    },
    {},
  );

  return (
    <div className="planner-chat-output">
      <div className="planner-chat-output-summary">
        {result.plan.summary.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      <div className="planner-chat-output-days">
        {weekdayLabels.map((day) => {
          const blocks = (blocksByDay[day.key] ?? []).sort((left, right) =>
            left.start.localeCompare(right.start),
          );
          if (blocks.length === 0) return null;

          return (
            <div className="planner-chat-output-day" key={day.key}>
              <strong>{day.label}</strong>
              <ul>
                {blocks.map((block) => (
                  <li key={block.id}>
                    <span>{block.start}–{block.end}</span>
                    {block.title}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className={`planner-chat-capacity ${result.capacityCheck.isCompatible ? "is-compatible" : "is-warning"}`}>
        {result.capacityCheck.isCompatible
          ? "Il piano rientra nella capacità settimanale disponibile."
          : result.capacityCheck.weeklyIssue ?? "Il piano presenta conflitti di capacità."}
      </p>
    </div>
  );
}
