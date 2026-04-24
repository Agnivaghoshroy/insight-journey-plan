import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BrainCircuit, FileText, Gauge, MoveRight, ShieldCheck, Target, Upload } from "lucide-react";

import { AssessmentChat } from "@/components/assessment/AssessmentChat";
import { LearningPlanSection } from "@/components/assessment/LearningPlanSection";
import { SkillMatrixSection } from "@/components/assessment/SkillMatrixSection";
import { StepRail } from "@/components/assessment/StepRail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAssessmentMachine } from "@/hooks/useAssessmentMachine";

const Index = () => {
  const {
    answerDraft,
    currentQuestion,
    currentSkill,
    generateSkillMap,
    isGeneratingMap,
    isParsingFile,
    isSubmittingAnswer,
    jobDescription,
    parseResumeUpload,
    progressValue,
    resetAssessment,
    resumeText,
    setAnswerDraft,
    setJobDescription,
    setResumeText,
    setTargetRole,
    startAssessment,
    state,
    submitAnswer,
    targetRole,
    uploadStatus,
    validationError,
  } = useAssessmentMachine();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement | null>(null);

  const handleResumeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await parseResumeUpload(file);
      toast({ title: "Resume parsed", description: `${file.name} is ready for skill mapping.` });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to parse that file.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleGenerateMap = async () => {
    const ok = await generateSkillMap();
    if (ok) {
      toast({ title: "Skill map generated", description: "Priority skills and evidence are ready for review." });
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#f5f3ee",
      useCORS: true,
      windowWidth: reportRef.current.scrollWidth,
    });

    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 64;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let remainingHeight = imgHeight;
    let position = 32;

    pdf.addImage(image, "PNG", 32, position, imgWidth, imgHeight);
    remainingHeight -= pageHeight - 64;

    while (remainingHeight > 0) {
      position = remainingHeight - imgHeight + 32;
      pdf.addPage();
      pdf.addImage(image, "PNG", 32, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight - 64;
    }

    pdf.save(`${targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-learning-plan.pdf`);
    toast({ title: "PDF exported", description: "The personalised learning plan has been downloaded." });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="hero-grid border-b border-border/60">
        <div className="container grid gap-12 py-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge variant="outline" className="px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                AI skill assessment and learning plan agent
              </Badge>
              <div className="space-y-4">
                <h1 className="font-display max-w-4xl text-4xl leading-[0.95] text-balance text-foreground sm:text-5xl lg:text-6xl">
                  Assess actual skill readiness against a role, not just resume claims.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Paste a job description, add a resume, complete a focused adaptive interview, and receive a realistic learning plan built around the skills you can acquire next.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="surface-panel border-border/70">
                <CardContent className="p-5">
                  <FileText className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-semibold text-foreground">Structured parsing</p>
                  <p className="mt-2 text-sm text-muted-foreground">Normalizes JD requirements and resume evidence into one comparable skill model.</p>
                </CardContent>
              </Card>
              <Card className="surface-panel border-border/70">
                <CardContent className="p-5">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-semibold text-foreground">Adaptive interview</p>
                  <p className="mt-2 text-sm text-muted-foreground">Questions branch based on depth, so the session stays short and high signal.</p>
                </CardContent>
              </Card>
              <Card className="surface-panel border-border/70">
                <CardContent className="p-5">
                  <Target className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-semibold text-foreground">Practical roadmap</p>
                  <p className="mt-2 text-sm text-muted-foreground">Prioritizes high-impact gaps with adjacent skills that are realistic to learn next.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="surface-panel border-border/70">
            <CardHeader className="space-y-2">
              <p className="section-label">Assessment principles</p>
              <CardTitle className="font-display text-2xl">Designed for clear, candidate-facing evaluation</CardTitle>
              <CardDescription>
                The first version is single-session, minimal, and focused on the top-priority skill gaps for one role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-4">
                <div className="flex items-center gap-3 text-foreground">
                  <Gauge className="h-4 w-4 text-primary" />
                  5–8 skills prioritized by role impact
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Gentle probing when claimed tenure and answer depth do not align
                </div>
                <div className="flex items-center gap-3 text-foreground">
                  <MoveRight className="h-4 w-4 text-primary" />
                  In-app report plus downloadable PDF export
                </div>
              </div>
              <p>
                This experience uses a deterministic local scoring engine for the MVP so the full workflow is usable immediately. The structure is ready for a backend AI upgrade path.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container space-y-8 py-8 sm:py-12 lg:py-14">
        <StepRail currentStep={state.step} />

        {state.step === "input" ? (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="surface-panel border-border/70">
              <CardHeader className="space-y-2">
                <p className="section-label">Input workspace</p>
                <CardTitle className="font-display text-3xl text-balance">Add the target role, job description, and candidate resume</CardTitle>
                <CardDescription>
                  Use pasted text for the fastest review, or upload a PDF, DOCX, or TXT resume file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="target-role">
                      Target role
                    </label>
                    <Input id="target-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Senior Product Engineer" />
                  </div>

                  <Tabs defaultValue="paste" className="space-y-4">
                    <TabsList className="grid h-auto grid-cols-2 rounded-md bg-muted/80 p-1">
                      <TabsTrigger value="paste">Paste resume text</TabsTrigger>
                      <TabsTrigger value="upload">Upload file</TabsTrigger>
                    </TabsList>
                    <TabsContent value="paste" className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="resume-text">
                          Resume text
                        </label>
                        <Textarea
                          id="resume-text"
                          value={resumeText}
                          onChange={(event) => setResumeText(event.target.value)}
                          placeholder="Paste the candidate's resume or profile summary here."
                          className="min-h-[260px] resize-none"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="upload" className="space-y-4">
                      <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border/80 bg-background/50 px-6 text-center transition-colors hover:border-primary/40 hover:bg-background">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-muted/80">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Upload PDF, DOCX, or TXT</p>
                          <p className="text-sm text-muted-foreground">The parsed text will populate the resume field for review before assessment.</p>
                        </div>
                        <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleResumeFileChange} />
                        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Single file · no account required</span>
                      </label>
                      {uploadStatus ? <p className="text-sm text-muted-foreground">{uploadStatus}</p> : null}
                      {isParsingFile ? <p className="text-sm text-muted-foreground">Parsing file…</p> : null}
                    </TabsContent>
                  </Tabs>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="job-description">
                      Job description
                    </label>
                    <Textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Paste the full job description, including must-have skills and responsibilities."
                      className="min-h-[280px] resize-none"
                    />
                  </div>
                </div>

                {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={resetAssessment}>
                    Reset
                  </Button>
                  <Button size="lg" onClick={handleGenerateMap} disabled={isGeneratingMap}>
                    {isGeneratingMap ? "Generating..." : "Generate skill map"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="surface-panel border-border/70">
                <CardHeader className="space-y-2">
                  <p className="section-label">What happens next</p>
                  <CardTitle className="font-display text-2xl">Five-step candidate workflow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <p className="font-medium text-foreground">1. Parse</p>
                    <p className="mt-1">Extract required skills, claims, and evidence signals.</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <p className="font-medium text-foreground">2. Map</p>
                    <p className="mt-1">Sort skills into strong matches, weak matches, gaps, and bonus strengths.</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <p className="font-medium text-foreground">3. Assess</p>
                    <p className="mt-1">Run a short conversational interview on the highest-value skills first.</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <p className="font-medium text-foreground">4. Rank gaps</p>
                    <p className="mt-1">Measure role impact against assessed proficiency and learnability.</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-4">
                    <p className="font-medium text-foreground">5. Plan</p>
                    <p className="mt-1">Generate a realistic, milestone-based roadmap with current resources.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {state.step === "mapping" && state.session ? (
          <SkillMatrixSection
            skills={state.skillMatrix}
            prioritizedCount={state.session.prioritizedSkills.length}
            onStart={startAssessment}
            isStarting={isSubmittingAnswer}
          />
        ) : null}

        {state.step === "assessment" && state.session ? (
          <AssessmentChat
            answerDraft={answerDraft}
            currentQuestion={currentQuestion}
            currentSkillLabel={currentSkill?.skill ?? null}
            isSubmitting={isSubmittingAnswer}
            progressValue={progressValue}
            turnCount={state.session.turns.length}
            validationError={validationError}
            onAnswerChange={setAnswerDraft}
            onSubmit={submitAnswer}
          />
        ) : null}

        {state.step === "results" && state.plan && state.session ? (
          <div ref={reportRef}>
            <LearningPlanSection
              plan={state.plan}
              summaries={state.summaries}
              targetRole={targetRole}
              turns={state.session.turns}
              onExport={exportPdf}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default Index;
