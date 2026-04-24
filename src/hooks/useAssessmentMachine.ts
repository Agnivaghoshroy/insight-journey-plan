import { useMemo, useState } from "react";
import { z } from "zod";

import {
  buildAssessmentSummary,
  buildLearningPlan,
  buildSkillMatrix,
  createSession,
  getQuestionForSkill,
  parseResumeFile,
  prioritizeSkills,
  recordTurn,
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

  const currentSkill = useMemo(() => {
    if (!state.session || state.session.complete) return null;
    return state.session.prioritizedSkills[state.session.currentSkillIndex] ?? null;
  }, [state.session]);

  const currentQuestion = useMemo(() => {
    if (!currentSkill || !state.session) return null;
    return getQuestionForSkill(currentSkill, state.session.turns);
  }, [currentSkill, state.session]);

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

  const generateSkillMap = () => {
    const parsed = inputSchema.safeParse({ jobDescription, resumeText, targetRole });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please review the inputs.");
      return false;
    }

    const matrix = buildSkillMatrix(parsed.data.jobDescription, parsed.data.resumeText);
    const prioritizedSkills = prioritizeSkills(matrix);

    setState((previous) => ({
      ...previous,
      skillMatrix: matrix,
      session: createSession(prioritizedSkills),
      plan: null,
      summaries: [],
      step: "mapping",
    }));
    setValidationError(null);
    setUploadStatus(null);
    return true;
  };

  const startAssessment = () => {
    if (!state.session) return;
    setState((previous) => ({ ...previous, step: "assessment" }));
    setAnswerDraft("");
  };

  const submitAnswer = () => {
    if (!state.session || !answerDraft.trim()) {
      setValidationError("Add an answer before continuing.");
      return;
    }

    const nextSession = recordTurn(state.session, answerDraft.trim());
    const summaries = nextSession.complete ? buildAssessmentSummary(nextSession) : [];
    const plan = nextSession.complete ? buildLearningPlan(summaries) : null;

    setState((previous) => ({
      ...previous,
      session: nextSession,
      summaries,
      plan,
      step: nextSession.complete ? "results" : previous.step,
    }));
    setAnswerDraft("");
    setValidationError(null);
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
    isParsingFile,
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
