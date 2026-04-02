"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepRubricSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Criterion = {
  id?: string;
  name: string;
  description: string;
  sortOrder: number;
};

export function StepRubric() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const [criteria, setCriteria] = useState<Criterion[]>(
    wizard.data.rubric.criteria.map((c, i) => ({
      ...c,
      description: c.description || "",
      sortOrder: i,
    }))
  );
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      { name: "", description: "", sortOrder: criteria.length },
    ]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 3) {
      toast.error("Minimum 3 criteria required");
      return;
    }
    setCriteria(
      criteria
        .filter((_, i) => i !== index)
        .map((c, i) => ({ ...c, sortOrder: i }))
    );
  };

  const updateCriterion = (
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    setCriteria(
      criteria.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newCriteria = [...criteria];
    const [dragged] = newCriteria.splice(dragIndex, 1);
    newCriteria.splice(index, 0, dragged);
    setCriteria(newCriteria.map((c, i) => ({ ...c, sortOrder: i })));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleNext = async () => {
    const data = { criteria };
    const result = stepRubricSchema.safeParse(data);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setError(firstIssue.message);
      return;
    }

    // Check all criteria have names
    const emptyNames = criteria.filter((c) => !c.name.trim());
    if (emptyNames.length > 0) {
      setError("All criteria must have a name");
      return;
    }
    setError("");

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 6,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "rubric", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 6 });
      dispatch({ type: "SET_CURRENT_STEP", step: 7 });
      toast.success("Rubric saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">
          Step 6 — Scoring Rubric
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Define at least 3 criteria that reviewers will use to score entries
          (1–5 each). Drag to reorder.
        </p>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="flex items-start gap-3 rounded-lg border border-border p-4 bg-card transition-opacity"
              style={{ opacity: dragIndex === index ? 0.5 : 1 }}
            >
              <div className="mt-2 cursor-grab text-muted-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Criterion {index + 1}
                  </Label>
                  <Input
                    value={criterion.name}
                    onChange={(e) =>
                      updateCriterion(index, "name", e.target.value)
                    }
                    placeholder="e.g. Innovation, Feasibility, Impact"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Guidance note (shown to reviewers)
                  </Label>
                  <Textarea
                    value={criterion.description}
                    onChange={(e) =>
                      updateCriterion(index, "description", e.target.value)
                    }
                    placeholder="Optional description for reviewers..."
                    rows={2}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-2 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeCriterion(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addCriterion} className="gap-2">
          <Plus className="h-4 w-4" /> Add Criterion
        </Button>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 5 })}
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
