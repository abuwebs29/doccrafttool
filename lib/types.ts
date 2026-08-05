export type QuestionType = "short_text" | "long_text" | "email" | "url" | "number" | "date" | "time" | "rating" | "linear_scale" | "acknowledgment" | "likert_matrix" | "multiple_choice" | "checkboxes" | "dropdown";

export type Question = {
  id: string;
  sectionId: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
  scoreEnabled?: boolean;
  points?: number;
  correctAnswers?: string[];
  description?: string;
  minValue?: number | null;
  maxValue?: number | null;
  minDate?: string | null;
  maxDate?: string | null;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  matrixRows?: string[];
  matrixColumns?: string[];
  includeInCount?: boolean;
};

export type FormSection = { id: string; title: string; description: string };
export type LogicAction = "next" | "goto" | "submit";
export type LogicRule = { id: string; sectionId: string; questionId: string; value: string; action: LogicAction; targetSectionId?: string };

export type FormRecord = {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: "draft" | "published" | "closed";
  openMode: "now" | "scheduled" | "closed";
  closeMode: "never" | "scheduled" | "closed";
  opensAt: string | null;
  closesAt: string | null;
  timezone: string;
  beforeOpenMessage: string;
  closedMessage: string;
  sections: FormSection[];
  questions: Question[];
  logicRules: LogicRule[];
  branchingEnabled?: boolean;
  showProgress: boolean;
  scoringEnabled?: boolean;
  successMessage?: string;
  redirectUrl?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  accentColor?: string;
  fontStyle?: "system" | "serif" | "rounded";
  showScoreAfterSubmission?: boolean;
  allowPdfDownload?: boolean;
  participantFieldQuestionId?: string | null;
  responseLimit?: number | null;
  oneResponsePerEmail?: boolean;
  linkExpiresAt?: string | null;
  spamProtectionEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  responseCount?: number;
};

export type AnswerValue = string | string[] | Record<string, string>;
export type FormResponse = {
  id: string;
  formId: string;
  submittedAt: string;
  answers: Record<string, AnswerValue>;
  totalScore: number;
  maxScore: number;
};
