"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepDeadlineSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const commonTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Pacific/Auckland",
];

export function StepDeadline() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const { deadline } = wizard.data;
  const [submissionDeadline, setSubmissionDeadline] = useState(
    deadline.submissionDeadline || ""
  );
  const [timezone, setTimezone] = useState(
    deadline.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleNext = async () => {
    const data = { submissionDeadline, timezone };
    const result = stepDeadlineSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 5,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "deadline", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 5 });
      dispatch({ type: "SET_CURRENT_STEP", step: 6 });
      toast.success("Deadline saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">
          Step 5 — Submission Deadline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline Date & Time *</Label>
          <Input
            id="deadline"
            type="datetime-local"
            value={submissionDeadline}
            onChange={(e) => setSubmissionDeadline(e.target.value)}
          />
          {errors.submissionDeadline && (
            <p className="text-sm text-destructive">
              {errors.submissionDeadline}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone *</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {commonTimezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p className="text-sm text-destructive">{errors.timezone}</p>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 4 })}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={updateStep.isPending}>
            {updateStep.isPending ? "Saving..." : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
