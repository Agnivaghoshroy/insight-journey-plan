export type SkillBucket = "matchedStrong" | "matchedWeak" | "gap" | "bonus";
export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface SkillEvidence {
  skill: string;
  normalizedSkill: string;
  category: string;
  aliases: string[];
  jdWeight: number;
  jdRequiredLevel: number;
  jdImportance: "must-have" | "nice-to-have";
  resumeYears: number;
  resumeContext: string[];
  confidence: number;
  bucket: SkillBucket;
}

export interface SkillQuestion {
  id: string;
  skill: string;
  level: SkillLevel;
  prompt: string;
  rubric: string[];
}

export interface SkillAssessmentTurn {
  skill: string;
  questionId: string;
  prompt: string;
  answer: string;
  score: number;
  notes: string;
  followUp?: boolean;
}

export interface SkillAssessmentSummary {
  skill: string;
  requiredLevel: number;
  assessedLevel: number;
  confidence: number;
  gapSeverity: number;
  rationale: string;
  adjacentSkills: string[];
}

export interface LearningResource {
  title: string;
  type: "Documentation" | "Course" | "Project" | "Book";
  url: string;
}

export interface SkillRoadmap {
  skill: string;
  rationale: string;
  currentLevelLabel: string;
  targetLevelLabel: string;
  timeEstimate: string;
  weeklyCommitment: string;
  milestones: string[];
  resources: LearningResource[];
  adjacentSkills: string[];
}

export interface LearningPlan {
  priorities: SkillAssessmentSummary[];
  roadmaps: SkillRoadmap[];
  totalTimeline: string;
  weeklyHours: string;
  summary: string;
}

export interface ResumeParseResult {
  resumeText: string;
  highlightedClaims: string[];
  matchedSkills: string[];
}

export interface AssessmentSession {
  prioritizedSkills: SkillEvidence[];
  currentSkillIndex: number;
  turns: SkillAssessmentTurn[];
  complete: boolean;
}
