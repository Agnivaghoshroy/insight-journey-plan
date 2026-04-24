import { ArrowRight, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { SkillQuestion } from "@/types/assessment";

interface AssessmentChatProps {
  answerDraft: string;
  currentQuestion: SkillQuestion | null;
  currentSkillLabel: string | null;
  progressValue: number;
  turnCount: number;
  validationError: string | null;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
}

export const AssessmentChat = ({
  answerDraft,
  currentQuestion,
  currentSkillLabel,
  progressValue,
  turnCount,
  validationError,
  onAnswerChange,
  onSubmit,
}: AssessmentChatProps) => {
  if (!currentQuestion || !currentSkillLabel) return null;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <Card className="surface-panel border-border/70">
        <CardHeader className="space-y-2">
          <p className="section-label">Assessment progress</p>
          <CardTitle className="font-display text-2xl">Focused on {currentSkillLabel}</CardTitle>
          <CardDescription>Each answer is scored for specificity, ownership, and technical depth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Interview completion</span>
              <span className="font-medium text-foreground">{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
          <div className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Clock3 className="h-4 w-4" />
              10–15 minute targeted review
            </div>
            <p>{turnCount} response{turnCount === 1 ? "" : "s"} captured so far.</p>
            <p>Short but concrete examples score better than general statements.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-panel border-border/70">
        <CardHeader className="space-y-2">
          <p className="section-label">Interview prompt</p>
          <CardTitle className="font-display text-2xl text-balance">{currentQuestion.prompt}</CardTitle>
          <CardDescription>
            Aim for a recent example, the context, the decision you made, and the measurable outcome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={answerDraft}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Describe what you owned, the trade-offs you handled, and what changed because of your work."
            className="min-h-[220px] resize-none"
          />
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <div className="flex justify-end">
            <Button onClick={onSubmit} size="lg">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
