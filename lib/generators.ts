export type GeneratorField = {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
};

export type GeneratorConfig = {
  slug: string;
  title: string;
  description: string;
  category: string;
  fields: GeneratorField[];
  template: (values: Record<string, string>) => string;
};

export const generators: GeneratorConfig[] = [
  {
    slug: "payment-reminder-email",
    title: "Payment Reminder Email Generator",
    description: "Create a clear, professional payment reminder in seconds.",
    category: "Business Email",
    fields: [
      { key: "client", label: "Client name", placeholder: "Alex" },
      { key: "invoice", label: "Invoice number", placeholder: "INV-1042" },
      { key: "amount", label: "Amount due", placeholder: "AED 2,500" },
      { key: "dueDate", label: "Due date", placeholder: "30 July 2026" },
      { key: "tone", label: "Tone", placeholder: "Polite", type: "select", options: ["Polite", "Firm", "Friendly"] }
    ],
    template: (v) => `Subject: Reminder: ${v.invoice || "invoice"} is due\n\nHi ${v.client || "there"},\n\nI hope you are well. This is a ${String(v.tone || "polite").toLowerCase()} reminder that ${v.invoice || "the invoice"} for ${v.amount || "the outstanding amount"} was due on ${v.dueDate || "the agreed date"}.\n\nPlease let me know when payment is scheduled, or if you need the invoice resent.\n\nThank you.`
  },
  {
    slug: "quotation-follow-up-email",
    title: "Quotation Follow-Up Email Generator",
    description: "Follow up on a quotation without sounding pushy.",
    category: "Sales",
    fields: [
      { key: "client", label: "Client name", placeholder: "Sam" },
      { key: "service", label: "Service or project", placeholder: "Website redesign" },
      { key: "sentDate", label: "Quotation sent date", placeholder: "25 July 2026" },
      { key: "nextStep", label: "Preferred next step", placeholder: "Schedule a 15-minute call", type: "textarea" }
    ],
    template: (v) => `Subject: Following up on the ${v.service || "quotation"}\n\nHi ${v.client || "there"},\n\nI wanted to follow up on the quotation for ${v.service || "your project"} that I sent on ${v.sentDate || "recently"}.\n\nPlease let me know if you have any questions or would like any changes. A good next step would be to ${String(v.nextStep || "confirm how you would like to proceed").replace(/^./, (c) => c.toLowerCase())}.\n\nBest regards.`
  },
  {
    slug: "customer-apology-email",
    title: "Customer Apology Email Generator",
    description: "Write a sincere apology that explains the issue and restores trust.",
    category: "Customer Service",
    fields: [
      { key: "customer", label: "Customer name", placeholder: "Jordan" },
      { key: "issue", label: "What went wrong?", placeholder: "Your order arrived two days late", type: "textarea" },
      { key: "resolution", label: "How are you fixing it?", placeholder: "We refunded the delivery fee", type: "textarea" },
      { key: "company", label: "Company name", placeholder: "DocCraft Studio" }
    ],
    template: (v) => `Subject: Our apologies\n\nHi ${v.customer || "there"},\n\nI am sorry that ${String(v.issue || "we did not meet your expectations").replace(/^./, (c) => c.toLowerCase())}. This is not the experience we want to provide.\n\n${v.resolution || "We are reviewing what happened and taking steps to put it right."}\n\nThank you for your patience and for giving us the opportunity to improve.\n\nSincerely,\n${v.company || "The team"}`
  }
];

export function getGenerator(slug: string) {
  return generators.find((generator) => generator.slug === slug);
}
