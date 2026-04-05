import { z } from "zod";

export const createEntrySchema = z.object({
  tournamentId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required").max(1000),
  submissionUrl: z.string().optional(),
});
export type CreateEntryInput = z.infer<typeof createEntrySchema>;

export const updateEntrySchema = z.object({
  entryId: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  submissionUrl: z.string().optional(),
});
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const criterionScoreSchema = z.object({
  criterionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().min(1, "Feedback is required"),
});

export const submitReviewSchema = z.object({
  reviewId: z.string().uuid(),
  criteriaScores: z.array(criterionScoreSchema).min(1),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const nominateSchema = z.object({
  tournamentId: z.string().uuid(),
  nominees: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    )
    .min(1),
});
export type NominateInput = z.infer<typeof nominateSchema>;
