import { useMemo, useState } from "react";
import { z } from "zod";

import { evaluateAssessmentAnswer, generateAssessmentMap } from "@/lib/assessmentApi";
import {
  buildAssessmentSummary,
  buildLearningPlan,
  createSession,
  parseResumeFile,
} from "@/lib/assessmentEngine";
import type { AssessmentSession, LearningPlan, ResumeParseResult, SkillAssessmentSummary, SkillEvidence } from "@/types/assessment";

const inputSchema = z.object({
  jobDescription: z.string().trim().min(120, "Add a fuller job description to generate a meaningful skill map.").max(12000),
  resumeText: z.string().trim().min(120, "Add more resume detail so the assessment can infer experience signals.").max(20000),
  targetRole: z.string().trim().min(2, "Enter the target role.").max(120),
});

export type WorkflowStep = "input" | "mapping" | "assessment" | "results";

interface AssessmentState {
  parsedResume: ResumeParseResult | null;
  skillMatrix: SkillEvidence[];
  session: AssessmentSession | null;
  summaries: SkillAssessmentSummary[];
  plan: LearningPlan | null;
  step: WorkflowStep;
}

const initialState: AssessmentState = {
  parsedResume: null,
  skillMatrix: [],
  session: null,
  summaries: [],
  plan: null,
  step: "input",
};

export const useAssessmentMachine = () => {
  const [state, setState] = useState<AssessmentState>(initialState);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("Product Engineer");
  const [answerDraft, setAnswerDraft] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  const currentSkill = useMemo(() => {
    if (!state.session || state.session.complete) return null;
    return state.session.prioritizedSkills[state.session.currentSkillIndex] ?? null;
  }, [state.session]);

  const currentQuestion = state.session?.currentQuestion ?? null;

  const progressValue = useMemo(() => {
    if (!state.session?.prioritizedSkills.length) return 0;
    const completedSkills = Math.min(state.session.currentSkillIndex, state.session.prioritizedSkills.length);
    return Math.round((completedSkills / state.session.prioritizedSkills.length) * 100);
  }, [state.session]);

  const parseResumeUpload = async (file: File) => {
    setIsParsingFile(true);
    setUploadStatus(`Parsing ${file.name}...`);
    setValidationError(null);

    try {
      const parsed = await parseResumeFile(file);
      setResumeText(parsed.resumeText);
      setState((previous) => ({ ...previous, parsedResume: parsed }));
      setUploadStatus(`${file.name} parsed successfully.`);
    } catch (error) {
      setUploadStatus(null);
      setValidationError(error instanceof Error ? error.message : "Resume parsing failed.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const generateSkillMap = async () => {
    const parsed = inputSchema.safeParse({ jobDescription, resumeText, targetRole });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please review the inputs.");
      return false;
    }

    setIsGeneratingMap(true);
    setValidationError(null);

    try {
      const response = await generateAssessmentMap({
        jobDescription: parsed.data.jobDescription,
        resumeText: parsed.data.resumeText,
        targetRole: parsed.data.targetRole,
      });
      const session = createSession(response.prioritizedSkills);

      setState((previous) => ({
        ...previous,
        skillMatrix: response.skillMatrix,
        session: { ...session, currentQuestion: response.firstQuestion },
        plan: null,
        summaries: [],
        step: "mapping",
      }));
      setUploadStatus(null);
      return true;
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Unable to generate the AI skill map.");
      return false;
    } finally {
      setIsGeneratingMap(false);
    }
  };

  const startAssessment = () => {
    if (!state.session) return;
    setState((previous) => ({ ...previous, step: "assessment" }));
    setAnswerDraft("");
  };

  const submitAnswer = async () => {
    if (!state.session || !answerDraft.trim()) {
      setValidationError("Add an answer before continuing.");
      return;
    }

    setIsSubmittingAnswer(true);
    setValidationError(null);

    try {
      const response = await evaluateAssessmentAnswer({
        answer: answerDraft.trim(),
        session: state.session,
        targetRole,
      });

      const summaries = response.session.complete
        ? (Array.isArray(response.summaries) && response.summaries.length > 0
            ? response.summaries
            : buildAssessmentSummary(response.session))
        : [];
      const aiPlan = response.plan as LearningPlan | null | undefined;
      const planIsValid =
        aiPlan &&
        Array.isArray(aiPlan.roadmaps) &&
        Array.isArray(aiPlan.priorities) &&
        typeof aiPlan.summary === "string";
      const plan = response.session.complete
        ? planIsValid
          ? aiPlan!
          : buildLearningPlan(summaries)
        : null;

      setState((previous) => ({
        ...previous,
        session: response.session,
        summaries,
        plan,
        step: response.session.complete ? "results" : previous.step,
      }));
      setAnswerDraft("");
    } catch (error) {
      // Keep the draft so the user can retry without retyping.
      setValidationError(error instanceof Error ? error.message : "Unable to score this answer right now.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const resetAssessment = () => {
    setState(initialState);
    setJobDescription("");
    setResumeText("");
    setTargetRole("Product Engineer");
    setAnswerDraft("");
    setValidationError(null);
    setUploadStatus(null);
  };

  return {
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
  };
};
