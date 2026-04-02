"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepTargetEntriesSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function StepTargetEntries() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const [targetEntries, setTargetEntries] = useState<string>(
    wizard.data.targetEntries.targetEntries?.toString() || ""
  );

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleNext = async () => {
    const value = targetEntries ? parseInt(targetEntries, 10) : null;
    const data = { targetEntries: value };
    const result = stepTargetEntriesSchema.safeParse(data);
    if (!result.success) {
      toast.error("Please enter a valid number or leave blank");
      return;
    }

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 4,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "targetEntries", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 4 });
      dispatch({ type: "SET_CURRENT_STEP", step: 5 });
      toast.success("Target entries saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Step 4 — Target Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="target">Expected Number of Entries</Label>
          <Input
            id="target"
            type="number"
            min={1}
            value={targetEntries}
            onChange={(e) => setTargetEntries(e.target.value)}
            placeholder="e.g. 200"
          />
          <p className="text-sm text-muted-foreground">
            Leave blank to calculate stages based on actual submissions after the
            deadline.
          </p>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 3 })}
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
