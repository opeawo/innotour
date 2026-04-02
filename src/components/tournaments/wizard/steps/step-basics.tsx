"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepBasicsSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function StepBasics() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const { data: basics } = wizard.data.basics
    ? { data: wizard.data.basics }
    : { data: { name: "", description: "", startDate: "", prizeDescription: "" } };

  const [name, setName] = useState(basics.name);
  const [description, setDescription] = useState(basics.description || "");
  const [startDate, setStartDate] = useState(basics.startDate || "");
  const [prizeDescription, setPrizeDescription] = useState(
    basics.prizeDescription || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createDraft = useMutation(
    trpc.tournament.createDraft.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleNext = async () => {
    const data = { name, description, startDate, prizeDescription };
    const result = stepBasicsSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      let tournamentId = wizard.tournamentId;

      if (!tournamentId) {
        const draft = await createDraft.mutateAsync({ name });
        tournamentId = draft.id;
        dispatch({ type: "SET_TOURNAMENT_ID", id: draft.id });
      }

      await updateStep.mutateAsync({
        tournamentId,
        step: 1,
        data: result.data,
      });

      dispatch({ type: "SET_STEP_DATA", key: "basics", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 1 });
      dispatch({ type: "SET_CURRENT_STEP", step: 2 });
      toast.success("Basics saved");
    } catch {
      // Error handled by mutation onError
    }
  };

  const isPending = createDraft.isPending || updateStep.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Step 1 — Basics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Tournament Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Innovation Challenge 2026"
            maxLength={255}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this tournament is about..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prize">Prize Description (optional)</Label>
          <Textarea
            id="prize"
            value={prizeDescription}
            onChange={(e) => setPrizeDescription(e.target.value)}
            placeholder="Describe the prize for the winner..."
            rows={2}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleNext} disabled={isPending}>
            {isPending ? "Saving..." : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
