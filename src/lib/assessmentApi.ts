import { supabase } from "@/integrations/supabase/client";
import type { EvaluateAnswerResponse, GenerateMapResponse, LearningPlan, SkillAssessmentSummary, SkillEvidence, SkillQuestion } from "@/types/assessment";

type AssessmentAction = "generate-map" | "evaluate-answer";

interface GenerateMapPayload {
  jobDescription: string;
  resumeText: string;
  targetRole: string;
}

interface EvaluateAnswerPayload {
  answer: string;
  session: {
    prioritizedSkills: SkillEvidence[];
    currentSkillIndex: number;
    turns: EvaluateAnswerResponse["session"]["turns"];
    complete: boolean;
    currentQuestion: SkillQuestion | null;
  };
  targetRole: string;
}

interface GenerateMapFunctionResponse extends GenerateMapResponse {
  firstQuestion: SkillQuestion | null;
}

interface FunctionErrorResponse {
  error?: string;
  details?: string;
}

const invokeAssessmentFunction = async <T>(action: AssessmentAction, payload: GenerateMapPayload | EvaluateAnswerPayload): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("assessment-ai", {
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new Error(error.message || "The AI backend request failed.");
  }

  const functionError = data as FunctionErrorResponse;
  if (functionError?.error) {
    throw new Error(functionError.details ? `${functionError.error}: ${functionError.details}` : functionError.error);
  }

  return data as T;
};

export const generateAssessmentMap = async (payload: GenerateMapPayload) =>
  invokeAssessmentFunction<GenerateMapFunctionResponse>("generate-map", payload);

export const evaluateAssessmentAnswer = async (payload: EvaluateAnswerPayload) =>
  invokeAssessmentFunction<EvaluateAnswerResponse>("evaluate-answer", payload);

export type AssessmentPlanPayload = {
  plan: LearningPlan | null;
  summaries: SkillAssessmentSummary[];
};