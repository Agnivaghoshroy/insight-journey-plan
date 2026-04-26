import { Download, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LearningPlan, SkillAssessmentSummary, SkillAssessmentTurn } from "@/types/assessment";

interface LearningPlanSectionProps {
  plan: LearningPlan;
  summaries: SkillAssessmentSummary[];
  targetRole: string;
  turns: SkillAssessmentTurn[];
  onExport: () => void;
}

export const LearningPlanSection = ({ plan, summaries, targetRole, turns, onExport }: LearningPlanSectionProps) => {
  return (
    <section className="space-y-6">
      <Card className="surface-panel border-border/70">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="section-label">Learning plan</p>
            <CardTitle className="font-display text-3xl text-balance">Personalised upskilling plan for {targetRole}</CardTitle>
            <CardDescription>{plan.summary}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-md border border-border/70 bg-background/60 px-4 py-3 text-sm">
              <div className="text-muted-foreground">Timeline</div>
              <div className="mt-1 font-semibold text-foreground">{plan.totalTimeline}</div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/60 px-4 py-3 text-sm">
              <div className="text-muted-foreground">Weekly effort</div>
              <div className="mt-1 font-semibold text-foreground">{plan.weeklyHours}</div>
            </div>
            <Button size="lg" onClick={onExport}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="surface-panel border-border/70">
          <CardHeader className="space-y-2">
            <p className="section-label">Gap analysis</p>
            <CardTitle className="font-display text-2xl">Priority gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaries
              .sort((a, b) => b.gapSeverity - a.gapSeverity)
              .map((summary) => (
                <div key={summary.skill} className="rounded-md border border-border/70 bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{summary.skill}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{summary.rationale}</p>
                    </div>
                    <Badge variant={summary.gapSeverity > 10 ? "default" : "secondary"}>Severity {summary.gapSeverity}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-sm bg-muted/70 px-3 py-2">
                      <div className="text-muted-foreground">Required</div>
                      <div className="font-medium text-foreground">{Number.isFinite(summary.requiredLevel) ? summary.requiredLevel : 5}/10</div>
                    </div>
                    <div className="rounded-sm bg-muted/70 px-3 py-2">
                      <div className="text-muted-foreground">Assessed</div>
                      <div className="font-medium text-foreground">{Number.isFinite(summary.assessedLevel) ? summary.assessedLevel : 5}/10</div>
                    </div>
                    <div className="rounded-sm bg-muted/70 px-3 py-2">
                      <div className="text-muted-foreground">Confidence</div>
                      <div className="font-medium text-foreground">{Number.isFinite(summary.confidence) ? Math.round(summary.confidence * 100) : 50}%</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(summary.adjacentSkills ?? []).map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {(plan.roadmaps ?? []).map((roadmap) => (
            <Card key={roadmap.skill} className="surface-panel border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="section-label">Roadmap</p>
                  <Badge variant="outline">{roadmap.timeEstimate}</Badge>
                </div>
                <CardTitle className="font-display text-2xl">{roadmap.skill}</CardTitle>
                <CardDescription>{roadmap.rationale}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <div className="text-muted-foreground">Current level</div>
                    <div className="mt-1 font-medium text-foreground">{roadmap.currentLevelLabel}</div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <div className="text-muted-foreground">Target level</div>
                    <div className="mt-1 font-medium text-foreground">{roadmap.targetLevelLabel}</div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <div className="text-muted-foreground">Weekly commitment</div>
                    <div className="mt-1 font-medium text-foreground">{roadmap.weeklyCommitment}</div>
                  </div>
                </div>
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      <Sparkles className="h-4 w-4" /> Milestones
                    </h3>
                    <ul className="grid gap-2 text-sm text-muted-foreground">
                      {(roadmap.milestones ?? []).map((milestone) => (
                        <li key={milestone} className="rounded-sm bg-muted/70 px-3 py-2">
                          {milestone}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Resources</h3>
                    <div className="grid gap-3">
                      {(roadmap.resources ?? []).map((resource) => (
                        <a
                          key={resource.title}
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-border/70 bg-background/60 p-4 text-sm transition-colors hover:border-primary/40 hover:bg-background"
                        >
                          <div className="font-medium text-foreground">{resource.title}</div>
                          <div className="mt-1 text-muted-foreground">{resource.type}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Why this is learnable next</h3>
                  <div className="flex flex-wrap gap-2">
                    {(roadmap.adjacentSkills ?? []).map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="surface-panel border-border/70">
            <CardHeader className="space-y-2">
              <p className="section-label">Assessment notes</p>
              <CardTitle className="font-display text-2xl">Scoring trace</CardTitle>
              <CardDescription>Every answer contributes to the final proficiency and confidence estimate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {turns.map((turn, index) => (
                <div key={`${turn.questionId}-${index}`} className="rounded-md border border-border/70 bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{turn.skill}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{turn.prompt}</p>
                    </div>
                    <Badge variant={turn.score >= 7 ? "default" : "secondary"}>{turn.score}/10</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{turn.notes}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
