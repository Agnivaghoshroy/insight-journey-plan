import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/hooks/useAssessmentMachine";

const steps: Array<{ id: WorkflowStep; label: string; caption: string }> = [
  { id: "input", label: "Inputs", caption: "Job brief and resume" },
  { id: "mapping", label: "Skill map", caption: "Evidence and priorities" },
  { id: "assessment", label: "Assessment", caption: "Focused interview" },
  { id: "results", label: "Learning plan", caption: "Gap analysis and roadmap" },
];

const order: WorkflowStep[] = ["input", "mapping", "assessment", "results"];

export const StepRail = ({ currentStep }: { currentStep: WorkflowStep }) => {
  const currentIndex = order.indexOf(currentStep);

  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isDone = index < currentIndex;

        return (
          <li
            key={step.id}
            className={cn(
              "surface-panel flex items-center gap-3 p-4",
              isCurrent && "border-primary/40 shadow-[var(--shadow-soft)]",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                isDone && "border-primary bg-primary text-primary-foreground",
                isCurrent && !isDone && "border-primary text-primary",
                !isCurrent && !isDone && "border-border text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.caption}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
