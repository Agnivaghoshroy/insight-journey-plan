import { adjacencyMap, fallbackRoadmaps, questionBank, sampleSkillMatrix, skillAliasMap } from "@/data/assessmentData";
import type {
  AssessmentSession,
  LearningPlan,
  ResumeParseResult,
  SkillAssessmentSummary,
  SkillAssessmentTurn,
  SkillEvidence,
  SkillQuestion,
  SkillRoadmap,
} from "@/types/assessment";

const stopWords = new Set([
  "and",
  "with",
  "for",
  "the",
  "that",
  "from",
  "into",
  "have",
  "has",
  "will",
  "your",
  "years",
  "experience",
  "required",
  "preferred",
  "skills",
  "skill",
  "using",
]);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const estimateYears = (resumeText: string, skill: string) => {
  const regex = new RegExp(`(\\d+)\\+?\\s*(?:years|yrs?).{0,30}${skill}`, "i");
  const match = resumeText.match(regex);
  return match ? Number(match[1]) : 0;
};

const sentenceSnippets = (text: string, term: string) => {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.filter((sentence) => sentence.toLowerCase().includes(term.toLowerCase())).slice(0, 3);
};

const extractCandidateTerms = (text: string) => {
  const matches = text.match(/[A-Za-z][A-Za-z+.#/\-]{2,}/g) ?? [];
  return Array.from(new Set(matches.map((term) => term.trim()))).filter((term) => !stopWords.has(term.toLowerCase()));
};

const inferCategory = (skill: string) => {
  const lowered = skill.toLowerCase();
  if (["react", "typescript", "javascript", "next.js", "figma"].includes(lowered)) return "Frontend";
  if (["python", "sql", "node.js", "rest apis"].includes(lowered)) return "Engineering";
  if (["aws", "docker", "kubernetes"].includes(lowered)) return "Infrastructure";
  if (["leadership", "communication"].includes(lowered)) return "Collaboration";
  return "General";
};

const detectSkillsFromText = (text: string) => {
  const lowerText = text.toLowerCase();
  const detected = Object.entries(skillAliasMap)
    .filter(([, aliases]) => aliases.some((alias) => lowerText.includes(alias.toLowerCase())))
    .map(([key, aliases]) => ({ key, aliases }));

  const extras = extractCandidateTerms(text)
    .filter((term) => !detected.some(({ aliases }) => aliases.some((alias) => alias.toLowerCase() === term.toLowerCase())))
    .slice(0, 12)
    .map((term) => ({ key: normalize(term), aliases: [term] }));

  return [...detected, ...extras];
};

export const parseResumeFile = async (file: File): Promise<ResumeParseResult> => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || ["txt", "md"].includes(extension)) {
    const resumeText = await file.text();
    return {
      resumeText,
      highlightedClaims: resumeText.split(/\n+/).filter(Boolean).slice(0, 5),
      matchedSkills: detectSkillsFromText(resumeText).map(({ aliases }) => aliases[0]),
    };
  }

  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

    const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
      }),
    );

    const resumeText = pages.join("\n\n");
    return {
      resumeText,
      highlightedClaims: pages.slice(0, 5),
      matchedSkills: detectSkillsFromText(resumeText).map(({ aliases }) => aliases[0]),
    };
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const resumeText = result.value;

    return {
      resumeText,
      highlightedClaims: resumeText.split(/\n+/).filter(Boolean).slice(0, 5),
      matchedSkills: detectSkillsFromText(resumeText).map(({ aliases }) => aliases[0]),
    };
  }

  throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
};

export const buildSkillMatrix = (jobDescription: string, resumeText: string): SkillEvidence[] => {
  if (!jobDescription.trim() || !resumeText.trim()) {
    return sampleSkillMatrix;
  }

  const jdSkills = detectSkillsFromText(jobDescription);
  const resumeSkills = detectSkillsFromText(resumeText);

  const uniqueMap = new Map<string, SkillEvidence>();

  jdSkills.forEach(({ key, aliases }, index) => {
    const primaryAlias = aliases[0];
    const skillLabel = titleCase(primaryAlias.replace(/\./g, " "))
      .replace(/Js$/i, "JS")
      .replace(/^Ml$/i, "ML");
    const inResume = resumeSkills.find((entry) => entry.key === key || entry.aliases.some((alias) => aliases.includes(alias)));
    const years = estimateYears(resumeText, primaryAlias);
    const contexts = sentenceSnippets(resumeText, primaryAlias);
    const jdWeight = Math.max(4, 10 - index);
    const bucket: SkillEvidence["bucket"] = inResume ? (contexts.length > 0 || years >= 2 ? "matchedStrong" : "matchedWeak") : "gap";

    uniqueMap.set(key, {
      skill: skillLabel,
      normalizedSkill: key,
      category: inferCategory(skillLabel),
      aliases,
      jdWeight,
      jdRequiredLevel: bucket === "gap" ? 7 : 6 + Math.min(2, Math.round(jdWeight / 4)),
      jdImportance: index < 6 ? "must-have" : "nice-to-have",
      resumeYears: years,
      resumeContext: contexts,
      confidence: inResume ? (contexts.length > 0 ? 0.82 : 0.58) : 0.34,
      bucket,
    });
  });

  resumeSkills.forEach(({ key, aliases }) => {
    if (uniqueMap.has(key)) return;
    const primaryAlias = aliases[0];
    uniqueMap.set(key, {
      skill: titleCase(primaryAlias.replace(/\./g, " ")),
      normalizedSkill: key,
      category: inferCategory(primaryAlias),
      aliases,
      jdWeight: 2,
      jdRequiredLevel: 3,
      jdImportance: "nice-to-have",
      resumeYears: estimateYears(resumeText, primaryAlias),
      resumeContext: sentenceSnippets(resumeText, primaryAlias),
      confidence: 0.55,
      bucket: "bonus",
    });
  });

  return Array.from(uniqueMap.values())
    .sort((a, b) => b.jdWeight - a.jdWeight)
    .slice(0, 12);
};

export const prioritizeSkills = (matrix: SkillEvidence[]) =>
  matrix
    .filter((skill) => skill.bucket !== "bonus")
    .sort((a, b) => b.jdWeight + b.confidence - (a.jdWeight + a.confidence))
    .slice(0, 6);

const defaultQuestionForSkill = (skill: SkillEvidence): SkillQuestion => ({
  id: `${skill.normalizedSkill}-int-default`,
  skill: skill.skill,
  level: "intermediate",
  prompt: `Describe the last time you used ${skill.skill} in practice and what level of ownership you had.`,
  rubric: ["Specificity", "Ownership", "Technical depth"],
});

export const getQuestionForSkill = (skill: SkillEvidence, turns: SkillAssessmentTurn[]): SkillQuestion => {
  const bank = questionBank[skill.normalizedSkill] ?? [];
  const priorTurn = turns.filter((turn) => turn.skill === skill.skill).at(-1);

  if (!priorTurn) {
    return bank.find((question) => question.level === "intermediate") ?? bank[0] ?? defaultQuestionForSkill(skill);
  }

  if (priorTurn.score >= 8) {
    return bank.find((question) => question.level === "advanced") ?? defaultQuestionForSkill(skill);
  }

  if (priorTurn.score <= 4) {
    return bank.find((question) => question.level === "beginner") ?? defaultQuestionForSkill(skill);
  }

  return {
    ...defaultQuestionForSkill(skill),
    id: `${skill.normalizedSkill}-follow-up`,
    prompt: `Can you walk me through a concrete example that shows your depth with ${skill.skill}? Include decisions, trade-offs, and outcomes.`,
  };
};

export const scoreAnswer = (answer: string, skill: SkillEvidence) => {
  const lengthScore = Math.min(4, Math.floor(answer.trim().split(/\s+/).length / 20));
  const specificityKeywords = [
    "built",
    "designed",
    "improved",
    "reduced",
    "scaled",
    "debugged",
    "shipped",
    "measured",
    "led",
    skill.skill.toLowerCase(),
  ];
  const specificityScore = specificityKeywords.reduce((score, keyword) => score + Number(answer.toLowerCase().includes(keyword)), 0);
  const confidencePenalty = skill.resumeYears >= 4 && answer.trim().split(/\s+/).length < 35 ? 1.5 : 0;
  const score = Math.max(1, Math.min(10, 3 + lengthScore + specificityScore * 0.5 - confidencePenalty));

  let notes = "Shows developing familiarity.";
  if (score >= 8) notes = "Concrete, high-signal answer with clear ownership and trade-off awareness.";
  else if (score >= 6) notes = "Solid working knowledge, but could show more depth or breadth.";
  else if (score <= 4) notes = "Answer stays high-level; follow-up should probe practical execution.";

  return { score: Number(score.toFixed(1)), notes };
};

export const createSession = (prioritizedSkills: SkillEvidence[]): AssessmentSession => ({
  prioritizedSkills,
  currentSkillIndex: 0,
  turns: [],
  complete: prioritizedSkills.length === 0,
  currentQuestion: prioritizedSkills.length > 0 ? getQuestionForSkill(prioritizedSkills[0], []) : null,
});

export const recordTurn = (session: AssessmentSession, answer: string) => {
  const skill = session.prioritizedSkills[session.currentSkillIndex];
  const question = getQuestionForSkill(skill, session.turns);
  const evaluation = scoreAnswer(answer, skill);

  const turn: SkillAssessmentTurn = {
    skill: skill.skill,
    questionId: question.id,
    prompt: question.prompt,
    answer,
    score: evaluation.score,
    notes: evaluation.notes,
    followUp: session.turns.filter((existing) => existing.skill === skill.skill).length > 0,
  };

  const skillTurns = [...session.turns, turn].filter((existing) => existing.skill === skill.skill);
  const needsFollowUp = skillTurns.length < 2 && evaluation.score < 7;

  return {
    ...session,
    turns: [...session.turns, turn],
    currentSkillIndex: needsFollowUp ? session.currentSkillIndex : session.currentSkillIndex + 1,
    complete: needsFollowUp ? false : session.currentSkillIndex + 1 >= session.prioritizedSkills.length,
    currentQuestion: needsFollowUp
      ? getQuestionForSkill(skill, [...session.turns, turn])
      : session.prioritizedSkills[session.currentSkillIndex + 1]
        ? getQuestionForSkill(session.prioritizedSkills[session.currentSkillIndex + 1], [...session.turns, turn])
        : null,
  };
};

export const buildAssessmentSummary = (session: AssessmentSession): SkillAssessmentSummary[] => {
  return session.prioritizedSkills.map((skill) => {
    const turns = session.turns.filter((turn) => turn.skill === skill.skill);
    const avgScore = turns.length > 0 ? turns.reduce((sum, turn) => sum + turn.score, 0) / turns.length : 3.5;
    const assessedLevel = Number(avgScore.toFixed(1));
    const gapSeverity = Number(Math.max(0, (skill.jdRequiredLevel - assessedLevel) * skill.jdWeight).toFixed(1));

    return {
      skill: skill.skill,
      requiredLevel: skill.jdRequiredLevel,
      assessedLevel,
      confidence: Number(Math.min(0.95, 0.45 + turns.length * 0.2 + skill.confidence * 0.2).toFixed(2)),
      gapSeverity,
      rationale:
        gapSeverity > 8
          ? `${skill.skill} is materially below the role target and should be addressed early.`
          : `${skill.skill} is close to target, but more applied depth would improve interview readiness.`,
      adjacentSkills: adjacencyMap[skill.normalizedSkill] ?? ["Applied projects", "Documentation", "Peer review"],
    };
  });
};

export const buildLearningPlan = (summaries: SkillAssessmentSummary[]): LearningPlan => {
  const priorities = [...summaries].sort((a, b) => b.gapSeverity - a.gapSeverity).slice(0, 4);

  const roadmaps: SkillRoadmap[] = priorities.map((summary) => {
    const fallback = fallbackRoadmaps.find((item) => item.skill === summary.skill);
    if (fallback) return fallback;

    return {
      skill: summary.skill,
      rationale: summary.rationale,
      currentLevelLabel: summary.assessedLevel >= 7 ? "Operational" : summary.assessedLevel >= 5 ? "Developing" : "Foundational",
      targetLevelLabel: summary.requiredLevel >= 8 ? "Interview-ready" : "Role-aligned",
      timeEstimate: summary.gapSeverity >= 18 ? "6-8 weeks" : summary.gapSeverity >= 10 ? "4-6 weeks" : "2-3 weeks",
      weeklyCommitment: summary.gapSeverity >= 18 ? "6-8 hours per week" : "4-5 hours per week",
      milestones: [
        `Explain ${summary.skill} decisions with concrete examples from practice.`,
        `Complete one scoped project that demonstrates ${summary.skill} independently.`,
        `Answer scenario-based interview prompts with clear trade-offs and outcomes.`,
      ],
      resources: [
        { title: `${summary.skill} official documentation`, type: "Documentation", url: `https://www.google.com/search?q=${encodeURIComponent(summary.skill + " official documentation")}` },
        { title: `${summary.skill} practical course`, type: "Course", url: `https://www.google.com/search?q=${encodeURIComponent(summary.skill + " practical course")}` },
        { title: `${summary.skill} portfolio project ideas`, type: "Project", url: `https://www.google.com/search?q=${encodeURIComponent(summary.skill + " project ideas")}` },
      ],
      adjacentSkills: summary.adjacentSkills,
    };
  });

  const totalWeeks = priorities.reduce((sum, item) => sum + (item.gapSeverity >= 18 ? 7 : item.gapSeverity >= 10 ? 5 : 3), 0);

  return {
    priorities,
    roadmaps,
    totalTimeline: `${Math.max(6, totalWeeks)} weeks`,
    weeklyHours: priorities.some((item) => item.gapSeverity >= 18) ? "6-8 hours per week" : "4-6 hours per week",
    summary:
      priorities.length > 0
        ? `Focus first on ${priorities[0].skill}${priorities[1] ? `, then ${priorities[1].skill}` : ""}. These gaps have the strongest role impact and are still realistic to close with adjacent knowledge.`
        : "You are broadly aligned with the role. Focus on maintaining readiness with targeted refreshers.",
  };
};

export const createPrintableHtml = (plan: LearningPlan, candidateRole: string) => {
  const roadmapMarkup = plan.roadmaps
    .map(
      (roadmap) => `
        <section style="margin-bottom: 28px; page-break-inside: avoid;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">${roadmap.skill}</h2>
          <p style="margin: 0 0 10px; color: #475569;">${roadmap.rationale}</p>
          <p style="margin: 0 0 10px;"><strong>Current:</strong> ${roadmap.currentLevelLabel} · <strong>Target:</strong> ${roadmap.targetLevelLabel}</p>
          <p style="margin: 0 0 10px;"><strong>Time estimate:</strong> ${roadmap.timeEstimate} · <strong>Commitment:</strong> ${roadmap.weeklyCommitment}</p>
          <h3 style="font-size: 14px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; color: #334155;">Milestones</h3>
          <ul style="padding-left: 18px; margin: 0 0 10px;">${roadmap.milestones.map((milestone) => `<li style="margin-bottom: 4px;">${milestone}</li>`).join("")}</ul>
          <h3 style="font-size: 14px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; color: #334155;">Resources</h3>
          <ul style="padding-left: 18px; margin: 0;">${roadmap.resources
            .map((resource) => `<li style="margin-bottom: 4px;"><a href="${resource.url}" style="color: #0f172a; text-decoration: none;">${resource.title}</a> <span style="color: #64748b;">(${resource.type})</span></li>`)
            .join("")}</ul>
        </section>
      `,
    )
    .join("");

  return `
    <article style="font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #0f172a; background: white; width: 800px;">
      <header style="margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b;">Skill Assessment Report</p>
        <h1 style="margin: 0 0 10px; font-size: 32px; line-height: 1.1;">${candidateRole}</h1>
        <p style="margin: 0; color: #475569;">${plan.summary}</p>
      </header>
      <section style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 28px;">
        <div style="border: 1px solid #e2e8f0; padding: 16px;"><div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Timeline</div><div style="font-size: 20px; margin-top: 6px;">${plan.totalTimeline}</div></div>
        <div style="border: 1px solid #e2e8f0; padding: 16px;"><div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Weekly effort</div><div style="font-size: 20px; margin-top: 6px;">${plan.weeklyHours}</div></div>
        <div style="border: 1px solid #e2e8f0; padding: 16px;"><div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Priority gaps</div><div style="font-size: 20px; margin-top: 6px;">${plan.priorities.length}</div></div>
      </section>
      ${roadmapMarkup}
    </article>
  `;
};
