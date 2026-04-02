"use client";

import { cn } from "@/lib/utils";
import { useWizard, useWizardDispatch } from "./wizard-context";
import { Check } from "lucide-react";

const steps = [
  { number: 1, label: "Basics" },
  { number: 2, label: "Branding" },
  { number: 3, label: "Submission" },
  { number: 4, label: "Target" },
  { number: 5, label: "Deadline" },
  { number: 6, label: "Rubric" },
  { number: 7, label: "Judges" },
  { number: 8, label: "Preview" },
];

export function WizardProgress() {
  const { currentStep, completedSteps } = useWizard();
  const dispatch = useWizardDispatch();

  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isComplete = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const canNavigate = isComplete || step.number <= currentStep;

          return (
            <li key={step.number} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() =>
                  canNavigate &&
                  dispatch({ type: "SET_CURRENT_STEP", step: step.number })
                }
                disabled={!canNavigate}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isCurrent &&
                    "bg-primary text-primary-foreground",
                  isComplete &&
                    !isCurrent &&
                    "bg-primary/10 text-primary hover:bg-primary/20",
                  !isCurrent &&
                    !isComplete &&
                    "text-muted-foreground",
                  canNavigate && !isCurrent && "cursor-pointer",
                  !canNavigate && "cursor-default opacity-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isCurrent && "bg-primary-foreground/20 text-primary-foreground",
                    isComplete && !isCurrent && "bg-primary text-primary-foreground",
                    !isCurrent && !isComplete && "border border-muted-foreground/30"
                  )}
                >
                  {isComplete && !isCurrent ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    step.number
                  )}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block h-px flex-1 min-w-4",
                    isComplete ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
