"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepSubmissionTypeSchema, type StepSubmissionTypeData } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Link, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const options: {
  value: StepSubmissionTypeData["submissionType"];
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "file_upload",
    label: "File Upload",
    description: "PDF, PPT, DOCX, MP4, ZIP — max 50MB per file",
    icon: Upload,
  },
  {
    value: "url",
    label: "URL",
    description: "A single link to a video, website, or document",
    icon: Link,
  },
  {
    value: "supporting_documents",
    label: "Supporting Documents",
    description: "Up to 5 files, max 10MB each",
    icon: FileText,
  },
];

export function StepSubmissionType() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const [selected, setSelected] = useState(
    wizard.data.submissionType.submissionType
  );

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleNext = async () => {
    const data = { submissionType: selected };
    const result = stepSubmissionTypeSchema.safeParse(data);
    if (!result.success) return;

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 3,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "submissionType", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 3 });
      dispatch({ type: "SET_CURRENT_STEP", step: 4 });
      toast.success("Submission type saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Step 3 — Submission Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Choose how entrants will submit their ideas. This cannot be changed
          once the tournament goes live.
        </p>

        <div className="grid gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                selected === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                  selected === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <option.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 2 })}
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
