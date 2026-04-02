"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepJudgePanelSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function StepJudgePanel() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const { judgePanel } = wizard.data;
  const [enableJudgePanel, setEnableJudgePanel] = useState(
    judgePanel.enableJudgePanel
  );
  const [judgeEmails, setJudgeEmails] = useState<string[]>(
    judgePanel.judgeEmails || [""]
  );
  const [errors, setErrors] = useState<Record<number, string>>({});

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const addEmail = () => {
    setJudgeEmails([...judgeEmails, ""]);
  };

  const removeEmail = (index: number) => {
    setJudgeEmails(judgeEmails.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateEmail = (index: number, value: string) => {
    setJudgeEmails(judgeEmails.map((e, i) => (i === index ? value : e)));
  };

  const handleNext = async () => {
    const filteredEmails = enableJudgePanel
      ? judgeEmails.filter((e) => e.trim())
      : [];

    const data = { enableJudgePanel, judgeEmails: filteredEmails };
    const result = stepJudgePanelSchema.safeParse(data);
    if (!result.success) {
      const newErrors: Record<number, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === "judgeEmails" && typeof issue.path[1] === "number") {
          newErrors[issue.path[1]] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 7,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "judgePanel", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 7 });
      dispatch({ type: "SET_CURRENT_STEP", step: 8 });
      toast.success("Judge panel saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">
          Step 7 — Expert Judge Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable expert judge panel for the final round</Label>
            <p className="text-sm text-muted-foreground">
              Final round scoring: 50% peer average / 50% judge average
            </p>
          </div>
          <Switch
            checked={enableJudgePanel}
            onCheckedChange={setEnableJudgePanel}
          />
        </div>

        {enableJudgePanel && (
          <div className="space-y-3">
            <Label>Judge Email Addresses</Label>
            {judgeEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="judge@example.com"
                />
                {judgeEmails.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {errors[index] && (
                  <p className="text-sm text-destructive">{errors[index]}</p>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addEmail} className="gap-2">
              <Plus className="h-4 w-4" /> Add Judge
            </Button>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 6 })}
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
