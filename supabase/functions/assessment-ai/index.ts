import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-map"),
    jobDescription: z.string().min(120).max(12000),
    resumeText: z.string().min(120).max(20000),
    targetRole: z.string().min(2).max(120),
  }),
  z.object({
    action: z.literal("evaluate-answer"),
    answer: z.string().min(8).max(8000),
    targetRole: z.string().min(2).max(120),
    session: z.object({
      prioritizedSkills: z.array(
        z.object({
          skill: z.string(),
          normalizedSkill: z.string(),
          category: z.string(),
          aliases: z.array(z.string()),
          jdWeight: z.number(),
          jdRequiredLevel: z.number(),
          jdImportance: z.enum(["must-have", "nice-to-have"]),
          resumeYears: z.number(),
          resumeContext: z.array(z.string()),
          confidence: z.number(),
          bucket: z.enum(["matchedStrong", "matchedWeak", "gap", "bonus"]),
          evidenceSummary: z.string().optional(),
        }),
      ),
      currentSkillIndex: z.number().int().min(0),
      turns: z.array(
        z.object({
          skill: z.string(),
          questionId: z.string(),
          prompt: z.string(),
          answer: z.string(),
          score: z.number(),
          notes: z.string(),
          followUp: z.boolean().optional(),
          strengths: z.array(z.string()).optional(),
          gaps: z.array(z.string()).optional(),
        }),
      ),
      complete: z.boolean(),
      currentQuestion: z
        .object({
          id: z.string(),
          skill: z.string(),
          level: z.enum(["beginner", "intermediate", "advanced"]),
          prompt: z.string(),
          rubric: z.array(z.string()),
          focus: z.string().optional(),
        })
        .nullable(),
    }),
  }),
]);

const model = "google/gemini-3-flash-preview";
const lovableAiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const callLovableAi = async (systemInstruction: string, userPrompt: string) => {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch(lovableAiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    if (response.status === 429) {
      throw new Response(
        JSON.stringify({
          error: "Lovable AI rate limit reached",
          details: "The workspace has hit its current Lovable AI rate or usage limit. Please try again shortly, or top up Cloud & AI balance if needed.",
        }),
        { status: 429, headers: jsonHeaders },
      );
    }

    if (response.status === 402) {
      throw new Response(
        JSON.stringify({
          error: "Lovable AI balance required",
          details: "The workspace has exhausted its included AI balance. Add funds in Settings → Cloud & AI balance to continue.",
        }),
        { status: 402, headers: jsonHeaders },
      );
    }

    throw new Error(`Lovable AI error [${response.status}]: ${rawText}`);
  }

  const parsed = JSON.parse(rawText);
  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Lovable AI returned an empty response");
  }

  return JSON.parse(content);
};

const mapResponseSchema = z.object({
  skillMatrix: z.array(
    z.object({
      skill: z.string(),
      normalizedSkill: z.string(),
      category: z.string(),
      aliases: z.array(z.string()),
      jdWeight: z.number().min(1).max(10),
      jdRequiredLevel: z.number().min(1).max(10),
      jdImportance: z.enum(["must-have", "nice-to-have"]),
      resumeYears: z.number().min(0).max(40),
      resumeContext: z.array(z.string()).max(3),
      confidence: z.number().min(0).max(1),
      bucket: z.enum(["matchedStrong", "matchedWeak", "gap", "bonus"]),
      evidenceSummary: z.string().optional(),
    }),
  ).min(1).max(12),
  prioritizedSkills: z.array(z.string()).min(1).max(6),
  firstQuestion: z.object({
    id: z.string(),
    skill: z.string(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    prompt: z.string(),
    rubric: z.array(z.string()).min(2).max(5),
    focus: z.string().optional(),
  }),
});

const evaluationResponseSchema = z.object({
  turn: z.object({
    score: z.number().min(1).max(10),
    notes: z.string(),
    strengths: z.array(z.string()).max(4),
    gaps: z.array(z.string()).max(4),
    followUp: z.boolean(),
  }),
  nextQuestion: z
    .object({
      id: z.string(),
      skill: z.string(),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      prompt: z.string(),
      rubric: z.array(z.string()).min(2).max(5),
      focus: z.string().optional(),
    })
    .nullable(),
  complete: z.boolean(),
  summaries: z
    .array(
      z.object({
        skill: z.string(),
        requiredLevel: z.number().min(1).max(10),
        assessedLevel: z.number().min(1).max(10),
        confidence: z.number().min(0).max(1),
        gapSeverity: z.number().min(0),
        rationale: z.string(),
        adjacentSkills: z.array(z.string()).max(6),
      }),
    )
    .optional(),
  plan: z
    .object({
      priorities: z.array(
        z.object({
          skill: z.string(),
          requiredLevel: z.number(),
          assessedLevel: z.number(),
          confidence: z.number(),
          gapSeverity: z.number(),
          rationale: z.string(),
          adjacentSkills: z.array(z.string()),
        }),
      ),
      roadmaps: z.array(
        z.object({
          skill: z.string(),
          rationale: z.string(),
          currentLevelLabel: z.string(),
          targetLevelLabel: z.string(),
          timeEstimate: z.string(),
          weeklyCommitment: z.string(),
          milestones: z.array(z.string()).min(3).max(5),
          resources: z.array(
            z.object({
              title: z.string(),
              type: z.enum(["Documentation", "Course", "Project", "Book"]),
              url: z.string().url(),
            }),
          ).min(2).max(5),
          adjacentSkills: z.array(z.string()).max(6),
        }),
      ),
      totalTimeline: z.string(),
      weeklyHours: z.string(),
      summary: z.string(),
    })
    .nullable()
    .optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (parsed.data.action === "generate-map") {
      const result = await callLovableAi(
        [
          "You are an assessment engine for candidate skill readiness.",
          "Return only valid JSON.",
          "Infer up to 12 relevant skills from the job description and resume.",
          "Buckets must be one of matchedStrong, matchedWeak, gap, bonus.",
          "Prioritize 4 to 6 non-bonus skills for interview assessment.",
          "The firstQuestion must target the highest-priority skill.",
        ].join(" "),
        JSON.stringify({
          targetRole: parsed.data.targetRole,
          jobDescription: parsed.data.jobDescription,
          resumeText: parsed.data.resumeText,
          outputContract: {
            skillMatrix: [{
              skill: "string",
              normalizedSkill: "string",
              category: "string",
              aliases: ["string"],
              jdWeight: 1,
              jdRequiredLevel: 1,
              jdImportance: "must-have | nice-to-have",
              resumeYears: 0,
              resumeContext: ["string"],
              confidence: 0,
              bucket: "matchedStrong | matchedWeak | gap | bonus",
              evidenceSummary: "string",
            }],
            prioritizedSkills: ["normalizedSkill"],
            firstQuestion: {
              id: "string",
              skill: "string",
              level: "beginner | intermediate | advanced",
              prompt: "string",
              rubric: ["string"],
              focus: "string",
            },
          },
        }),
      );

      const validated = mapResponseSchema.parse(result);
      const prioritizedSkills = validated.prioritizedSkills
        .map((key) => validated.skillMatrix.find((skill) => skill.normalizedSkill === key))
        .filter(Boolean);

      return new Response(
        JSON.stringify({
          skillMatrix: validated.skillMatrix,
          prioritizedSkills,
          firstQuestion: validated.firstQuestion,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    const currentSkill = parsed.data.session.prioritizedSkills[parsed.data.session.currentSkillIndex];
    if (!currentSkill || !parsed.data.session.currentQuestion) {
      return new Response(JSON.stringify({ error: "Assessment session is missing the current question." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const result = await callLovableAi(
      [
        "You are an interview evaluator for role-readiness assessment.",
        "Return only valid JSON.",
        "Score the answer from 1 to 10 for specificity, ownership, and technical depth.",
        "If the answer is weak and no follow-up has been asked for this skill yet, provide a follow-up question on the same skill.",
        "If all skills are complete, also provide summaries and a final learning plan.",
      ].join(" "),
      JSON.stringify({
        targetRole: parsed.data.targetRole,
        currentSkill,
        currentQuestion: parsed.data.session.currentQuestion,
        previousTurns: parsed.data.session.turns,
        answer: parsed.data.answer,
        remainingSkills: parsed.data.session.prioritizedSkills.slice(parsed.data.session.currentSkillIndex + 1),
        outputContract: {
          turn: {
            score: 1,
            notes: "string",
            strengths: ["string"],
            gaps: ["string"],
            followUp: true,
          },
          nextQuestion: {
            id: "string",
            skill: "string",
            level: "beginner | intermediate | advanced",
            prompt: "string",
            rubric: ["string"],
            focus: "string",
          },
          complete: false,
          summaries: [],
          plan: null,
        },
      }),
    );

    const validated = evaluationResponseSchema.parse(result);
    const nextTurns = [
      ...parsed.data.session.turns,
      {
        skill: currentSkill.skill,
        questionId: parsed.data.session.currentQuestion.id,
        prompt: parsed.data.session.currentQuestion.prompt,
        answer: parsed.data.answer,
        score: validated.turn.score,
        notes: validated.turn.notes,
        followUp: validated.turn.followUp,
        strengths: validated.turn.strengths,
        gaps: validated.turn.gaps,
      },
    ];

    const sameSkillFollowUp = validated.turn.followUp && validated.nextQuestion;
    const nextSkillIndex = sameSkillFollowUp ? parsed.data.session.currentSkillIndex : parsed.data.session.currentSkillIndex + 1;
    const fallbackNextQuestion = !sameSkillFollowUp ? validated.nextQuestion : null;

    return new Response(
      JSON.stringify({
        session: {
          prioritizedSkills: parsed.data.session.prioritizedSkills,
          currentSkillIndex: nextSkillIndex,
          turns: nextTurns,
          complete: validated.complete,
          currentQuestion: validated.complete ? null : sameSkillFollowUp ? validated.nextQuestion : fallbackNextQuestion,
        },
        summaries: validated.summaries,
        plan: validated.plan ?? null,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("assessment-ai error", error);
    if (error instanceof Response) {
      return error;
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown backend error",
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
});