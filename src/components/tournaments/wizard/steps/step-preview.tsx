"use client";

import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { calculateStages, reviewsPerReviewer } from "@/lib/stage-algorithm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Trophy,
  Calendar,
  FileText,
  Users,
  Palette,
  ClipboardCheck,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function StepPreview() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();
  const router = useRouter();

  const { basics, branding, submissionType, targetEntries, deadline, rubric, judgePanel } =
    wizard.data;

  const entryCount = targetEntries.targetEntries || 64;
  const stagesPreviews = calculateStages(entryCount, 3);
  const rpr = reviewsPerReviewer(entryCount);

  const publish = useMutation(
    trpc.tournament.publish.mutationOptions({
      onSuccess: () => {
        toast.success("Tournament published!");
        router.push("/dashboard");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handlePublish = async () => {
    if (!wizard.tournamentId) {
      toast.error("No tournament draft found");
      return;
    }
    await publish.mutateAsync({ tournamentId: wizard.tournamentId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            Step 8 — Preview & Confirm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary sections */}
          <div className="space-y-4">
            <SummarySection
              icon={Trophy}
              title="Basics"
              step={1}
              dispatch={dispatch}
            >
              <p className="font-medium">{basics.name || "Untitled"}</p>
              {basics.description && (
                <p className="text-sm text-muted-foreground">
                  {basics.description}
                </p>
              )}
              {basics.prizeDescription && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Prize:</span>{" "}
                  {basics.prizeDescription}
                </p>
              )}
            </SummarySection>

            <Separator />

            <SummarySection
              icon={Palette}
              title="Branding"
              step={2}
              dispatch={dispatch}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: branding.primaryColor }}
                />
                <span className="font-mono text-sm">
                  {branding.primaryColor}
                </span>
              </div>
            </SummarySection>

            <Separator />

            <SummarySection
              icon={FileText}
              title="Submission Type"
              step={3}
              dispatch={dispatch}
            >
              <Badge variant="secondary">
                {submissionType.submissionType.replace(/_/g, " ")}
              </Badge>
            </SummarySection>

            <Separator />

            <SummarySection
              icon={Users}
              title="Target Entries"
              step={4}
              dispatch={dispatch}
            >
              <p>
                {targetEntries.targetEntries
                  ? `${targetEntries.targetEntries} entries`
                  : "To be determined after deadline"}
              </p>
            </SummarySection>

            <Separator />

            <SummarySection
              icon={Calendar}
              title="Submission Deadline"
              step={5}
              dispatch={dispatch}
            >
              <p>
                {deadline.submissionDeadline
                  ? new Date(deadline.submissionDeadline).toLocaleString()
                  : "Not set"}{" "}
                ({deadline.timezone})
              </p>
            </SummarySection>

            <Separator />

            <SummarySection
              icon={ClipboardCheck}
              title="Scoring Rubric"
              step={6}
              dispatch={dispatch}
            >
              <div className="flex flex-wrap gap-2">
                {rubric.criteria.map((c, i) => (
                  <Badge key={i} variant="outline">
                    {c.name || `Criterion ${i + 1}`}
                  </Badge>
                ))}
              </div>
            </SummarySection>

            <Separator />

            <SummarySection
              icon={Scale}
              title="Expert Judges"
              step={7}
              dispatch={dispatch}
            >
              <p>
                {judgePanel.enableJudgePanel
                  ? `Enabled — ${judgePanel.judgeEmails?.length || 0} judge(s)`
                  : "Disabled"}
              </p>
            </SummarySection>
          </div>
        </CardContent>
      </Card>

      {/* Stage Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Stage Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Based on{" "}
            {targetEntries.targetEntries
              ? `${targetEntries.targetEntries} estimated entries`
              : "64 entries (default estimate)"}
            :
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {stagesPreviews.map((stage, index) => (
              <div key={stage.type} className="flex items-center gap-3">
                <div className="rounded-lg border border-border bg-card p-4 text-center min-w-[140px]">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Stage {index + 1}
                  </p>
                  <p className="mt-1 font-heading text-lg font-semibold">
                    {stage.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stage.entryCount} entries
                  </p>
                  <p className="text-xs text-primary font-medium mt-1">
                    Top {stage.advanceCount} advance
                  </p>
                </div>
                {index < stagesPreviews.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Each reviewer is assigned {rpr} entries to review.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 7 })}
        >
          Back
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publish.isPending}
          size="lg"
          className="gap-2"
        >
          {publish.isPending ? "Publishing..." : "Approve & Publish"}
          <Trophy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SummarySection({
  icon: Icon,
  title,
  step,
  dispatch,
  children,
}: {
  icon: React.ElementType;
  title: string;
  step: number;
  dispatch: ReturnType<typeof useWizardDispatch>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step })}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
