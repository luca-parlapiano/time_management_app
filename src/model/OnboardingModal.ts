import type { RawAnswers } from "./planning.js";

export interface OnboardingModalProps {
  answers: RawAnswers;
  onClose: () => void;
  onSubmit: (answers: RawAnswers) => void;
}
