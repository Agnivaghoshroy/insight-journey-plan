import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SkillEvidence } from "@/types/assessment";

const bucketLabels: Record<SkillEvidence["bucket"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  matchedStrong: { label: "Matched · strong", variant: "default" },
  matchedWeak: { label: "Matched · weak", variant: "secondary" },
  gap: { label: "Gap", variant: "outline" },
  bonus: { label: "Bonus", variant: "outline" },
};

export const SkillMatrixSection = ({
  isStarting,
  onStart,
  prioritizedCount,
  skills,
}: {
  isStarting?: boolean;
  onStart: () => void;
  prioritizedCount: number;
  skills: SkillEvidence[];
}) => {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="surface-panel border-border/70">
        <CardHeader className="space-y-2">
          <p className="section-label">Skill mapping</p>
          <CardTitle className="font-display text-2xl text-balance">Evidence-driven view of role fit</CardTitle>
          <CardDescription>
            Required skills are normalized, weighted by the job description, and mapped against what the resume actually supports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.map((skill) => (
            <div key={skill.normalizedSkill} className="rounded-md border border-border/70 bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{skill.skill}</h3>
                    <Badge variant={bucketLabels[skill.bucket].variant}>{bucketLabels[skill.bucket].label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {skill.category} · JD weight {skill.jdWeight}/10 · target proficiency {skill.jdRequiredLevel}/10
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Resume signal: {Math.round(skill.confidence * 100)}%</div>
                  <div>{skill.resumeYears > 0 ? `${skill.resumeYears}+ years indicated` : "No explicit tenure signal"}</div>
                </div>
              </div>
              {skill.resumeContext.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {skill.resumeContext.map((context) => (
                    <li key={context} className="rounded-sm bg-muted/70 px-3 py-2">
                      {context}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No concrete resume evidence was detected for this skill.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="surface-panel border-border/70">
        <CardHeader className="space-y-2">
          <p className="section-label">Assessment scope</p>
          <CardTitle className="font-display text-2xl">Focused interview</CardTitle>
          <CardDescription>
            The agent will assess the top {prioritizedCount} priority skills first to keep the session within a realistic interview window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <div className="grid gap-3 rounded-md border border-border/70 bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span>Interview style</span>
              <span className="font-medium text-foreground">Adaptive</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Coverage</span>
              <span className="font-medium text-foreground">Top-priority gaps and claims</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expected duration</span>
              <span className="font-medium text-foreground">10–15 minutes</span>
            </div>
          </div>
          <Separator />
          <ul className="grid gap-2">
            <li>Starts at intermediate level for skills supported by the resume.</li>
            <li>Raises or lowers difficulty based on answer depth.</li>
            <li>Uses follow-up probes when answers stay vague.</li>
          </ul>
          <Button className="w-full" size="lg" onClick={onStart} disabled={isStarting}>
            {isStarting ? "Preparing interview..." : "Start assessment"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
};
