export type QuestionType = "short_text" | "long_text" | "email" | "multiple_choice" | "checkboxes" | "dropdown";

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
  participantFieldQuestionId?: string | null;
  responseLimit?: number | null;
  oneResponsePerEmail?: boolean;
  oneResponsePerBrowser?: boolean;
  oneResponsePerAccessCode?: boolean;
  requireAccessCode?: boolean;
  accessCodes?: string[];
  linkExpiresAt?: string | null;
  spamProtectionEnabled?: boolean;
  referencePrefix?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  responseCount?: number;
};

export type AnswerValue = string | string[];
export type FormResponse = {
  id: string;
  formId: string;
  submittedAt: string;
  answers: Record<string, AnswerValue>;
  totalScore: number;
  maxScore: number;
  referenceNumber?: string;
};
