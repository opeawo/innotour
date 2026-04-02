export type StagePreview = {
  type: "group" | "semi_final" | "final";
  name: string;
  entryCount: number;
  advanceCount: number;
  sortOrder: number;
};

/**
 * Calculate the tournament stage structure based on entry count and final size.
 *
 * Algorithm from PRD Section 5.2:
 * - Final (Z): default 3, organiser may override to 2-5
 * - Semi-Final (Y): max(Z + 5, round(N × 0.12))
 * - Group Stage (X): all entries, top Y advance
 */
export function calculateStages(
  entryCount: number,
  finalSize: number = 3
): StagePreview[] {
  const n = Math.max(entryCount, finalSize);
  const z = finalSize;

  // Semi-Final entry count
  const y = Math.max(z + 5, Math.round(n * 0.12));
  // Clamp: semi-final can't exceed total entries
  const semiFinalCount = Math.min(y, n);

  return [
    {
      type: "group",
      name: "Group Stage",
      entryCount: n,
      advanceCount: semiFinalCount,
      sortOrder: 1,
    },
    {
      type: "semi_final",
      name: "Semi-Final",
      entryCount: semiFinalCount,
      advanceCount: z,
      sortOrder: 2,
    },
    {
      type: "final",
      name: "Final",
      entryCount: z,
      advanceCount: 1,
      sortOrder: 3,
    },
  ];
}

/**
 * Calculate reviews per reviewer for a given stage.
 * R = max(3, round(sqrt(N_stage))), capped at 10
 */
export function reviewsPerReviewer(entryCount: number): number {
  return Math.min(10, Math.max(3, Math.round(Math.sqrt(entryCount))));
}
