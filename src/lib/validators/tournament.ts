import { z } from "zod";

// Step 1 — Basics
export const stepBasicsSchema = z.object({
  name: z.string().min(1, "Tournament name is required").max(255),
  description: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  prizeDescription: z.string().optional().default(""),
});
export type StepBasicsData = z.infer<typeof stepBasicsSchema>;

// Step 2 — Branding
export const stepBrandingSchema = z.object({
  logoUrl: z.string().optional().default(""),
  bannerUrl: z.string().optional().default(""),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .default("#4F46E5"),
});
export type StepBrandingData = z.infer<typeof stepBrandingSchema>;

// Step 3 — Submission Type
export const stepSubmissionTypeSchema = z.object({
  submissionType: z.enum(["file_upload", "url", "supporting_documents"]),
});
export type StepSubmissionTypeData = z.infer<typeof stepSubmissionTypeSchema>;

// Step 4 — Target Entries
export const stepTargetEntriesSchema = z.object({
  targetEntries: z.number().int().positive().nullable().optional(),
});
export type StepTargetEntriesData = z.infer<typeof stepTargetEntriesSchema>;

// Step 5 — Submission Deadline
export const stepDeadlineSchema = z.object({
  submissionDeadline: z.string().min(1, "Deadline is required"),
  timezone: z.string().min(1, "Timezone is required"),
});
export type StepDeadlineData = z.infer<typeof stepDeadlineSchema>;

// Step 6 — Rubric
export const rubricCriterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Criterion name is required"),
  description: z.string().optional().default(""),
  sortOrder: z.number(),
});

export const stepRubricSchema = z.object({
  criteria: z
    .array(rubricCriterionSchema)
    .min(3, "At least 3 scoring criteria are required"),
});
export type StepRubricData = z.infer<typeof stepRubricSchema>;

// Step 7 — Expert Judge Panel
export const stepJudgePanelSchema = z.object({
  enableJudgePanel: z.boolean(),
  judgeEmails: z.array(z.string().email("Invalid email address")).optional().default([]),
});
export type StepJudgePanelData = z.infer<typeof stepJudgePanelSchema>;

// Full tournament schema for publish validation
export const tournamentFullSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  submissionType: z.enum(["file_upload", "url", "supporting_documents"]),
  submissionDeadline: z.string().min(1),
  criteria: z.array(rubricCriterionSchema).min(3),
});

// Step update discriminated input
export const stepUpdateSchema = z.object({
  tournamentId: z.string().uuid(),
  step: z.number().int().min(1).max(8),
  data: z.record(z.string(), z.unknown()),
});

// Wizard data shape
export type WizardData = {
  basics: StepBasicsData;
  branding: StepBrandingData;
  submissionType: StepSubmissionTypeData;
  targetEntries: StepTargetEntriesData;
  deadline: StepDeadlineData;
  rubric: StepRubricData;
  judgePanel: StepJudgePanelData;
};

export const defaultWizardData: WizardData = {
  basics: { name: "", description: "", startDate: "", prizeDescription: "" },
  branding: { logoUrl: "", bannerUrl: "", primaryColor: "#4F46E5" },
  submissionType: { submissionType: "file_upload" },
  targetEntries: { targetEntries: null },
  deadline: { submissionDeadline: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  rubric: {
    criteria: [
      { name: "", description: "", sortOrder: 0 },
      { name: "", description: "", sortOrder: 1 },
      { name: "", description: "", sortOrder: 2 },
    ],
  },
  judgePanel: { enableJudgePanel: false, judgeEmails: [] },
};
