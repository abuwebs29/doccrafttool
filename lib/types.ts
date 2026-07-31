export type QuestionType = "short_text" | "long_text" | "email" | "multiple_choice" | "checkboxes" | "dropdown";

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
};

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
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  responseCount?: number;
};
