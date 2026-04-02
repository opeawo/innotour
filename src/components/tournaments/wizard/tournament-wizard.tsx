"use client";

import { WizardProvider, useWizard } from "./wizard-context";
import { WizardProgress } from "./wizard-progress";
import { StepBasics } from "./steps/step-basics";
import { StepBranding } from "./steps/step-branding";
import { StepSubmissionType } from "./steps/step-submission-type";
import { StepTargetEntries } from "./steps/step-target-entries";
import { StepDeadline } from "./steps/step-deadline";
import { StepRubric } from "./steps/step-rubric";
import { StepJudgePanel } from "./steps/step-judge-panel";
import { StepPreview } from "./steps/step-preview";

function WizardSteps() {
  const { currentStep } = useWizard();

  const stepComponents: Record<number, React.ReactNode> = {
    1: <StepBasics />,
    2: <StepBranding />,
    3: <StepSubmissionType />,
    4: <StepTargetEntries />,
    5: <StepDeadline />,
    6: <StepRubric />,
    7: <StepJudgePanel />,
    8: <StepPreview />,
  };

  return (
    <div className="mx-auto max-w-2xl">
      {stepComponents[currentStep]}
    </div>
  );
}

export function TournamentWizard() {
  return (
    <WizardProvider>
      <div>
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Create Tournament
          </h1>
          <p className="mt-1 text-muted-foreground">
            Set up your innovation tournament step by step.
          </p>
        </div>
        <WizardProgress />
        <WizardSteps />
      </div>
    </WizardProvider>
  );
}
