import OpenAI from "openai";
import {
  ChatMessage,
  DifficultyLevel,
  Dog,
  TrainingPlan,
  TrainingSession,
} from "@/types/database";
import { getTrainingDataForAI } from "./database";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { TrainingStep } from "@/types/database";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: false,
});

const IMPROVED_SYSTEM_PROMPT =
  `You are an expert dog trainer with years of experience in positive reinforcement training methods and behavior modification. 
You have access to the user's complete training history, including:
- Their dog's profile (breed, age, weight)
- Current training plans and progress
- Recent training sessions and ratings
- Past interactions and advice
- Specific behaviors that need correction

When responding:
1. Reference specific details from their training history
2. Consider the dog's breed characteristics and age-appropriate exercises
3. If a specific behavior needs correction, prioritize exercises that address this issue while maintaining positive reinforcement
4. Acknowledge their progress and build upon completed steps
5. If they're struggling (low ratings), suggest modifications
6. Keep advice practical and focused on positive reinforcement
7. If they're doing well, suggest progression to more advanced exercises

For behavior correction:
- Start with understanding the root cause of the behavior
- Break down correction into small, manageable steps
- Focus on reinforcing alternative positive behaviors
- Include environmental management strategies
- Suggest preventive exercises

Remember to:
- Keep responses concise but informative
- Avoid technical jargon unless necessary
- Recommend veterinary consultation for health issues
- Celebrate their successes and progress`;

const SYSTEM_PROMPT = IMPROVED_SYSTEM_PROMPT;

// Add query classification function
function classifyQuery(message: string): "basic" | "training" | "complex" {
  // Basic queries about dog info or simple commands
  const basicPatterns = [
    /how\s+old|age/i,
    /what(?:'s|\s+is)\s+(?:the\s+)?(?:dog'?s?\s+)?(?:breed|name)/i,
    /basic\s+command|sit|stay|come/i,
  ];

  // Training-related queries
  const trainingPatterns = [
    /train(?:ing)?/i,
    /exercise|practice/i,
    /behavior|behaviour/i,
    /progress|improvement/i,
  ];

  if (basicPatterns.some((pattern) => pattern.test(message))) {
    return "basic";
  }
  if (trainingPatterns.some((pattern) => pattern.test(message))) {
    return "training";
  }
  return "complex";
}

// Optimize context based on query type
function getOptimizedContext(
  context: ChatMessage[],
  queryType: "basic" | "training" | "complex",
): ChatCompletionMessageParam[] {
  switch (queryType) {
    case "basic":
      // For basic queries, we only need the last message
      return context.slice(-1).flatMap((msg): ChatCompletionMessageParam[] => [
        { role: "user", content: msg.message },
        { role: "assistant", content: msg.ai_response },
      ]);
    case "training":
      // For training queries, get last 3 training-related messages
      return context
        .filter((msg) => classifyQuery(msg.message) === "training")
        .slice(-3)
        .flatMap((msg): ChatCompletionMessageParam[] => [
          { role: "user", content: msg.message },
          { role: "assistant", content: msg.ai_response },
        ]);
    case "complex":
      // For complex queries, get last 5 messages but prioritize related ones
      return context.slice(-5).flatMap((msg): ChatCompletionMessageParam[] => [
        { role: "user", content: msg.message },
        { role: "assistant", content: msg.ai_response },
      ]);
  }
}

export async function generateChatResponse(
  message: string,
  context: ChatMessage[] = [],
  userId?: string,
) {
  try {
    if (!userId) {
      return "Please sign in to get personalized training advice.";
    }

    const trainingData = await getTrainingDataForAI(userId);
    if (!trainingData.dogs?.length) {
      return "Please add your dog's information first to get personalized advice.";
    }

    // Fast path for basic dog information queries
    const dog = trainingData.dogs[0];
    const basicQueries = {
      age: /how\s+old|what(?:'s|\s+is)\s+(?:the\s+)?(?:dog'?s?\s+)?age/i,
      breed: /what(?:'s|\s+is)\s+(?:the\s+)?(?:dog'?s?\s+)?breed/i,
      name: /what(?:'s|\s+is)\s+(?:the\s+)?(?:dog'?s?\s+)?name/i,
    };

    if (basicQueries.age.test(message)) {
      return `${dog.name} is ${dog.age} years old.`;
    }
    if (basicQueries.breed.test(message)) {
      return dog.breed
        ? `${dog.name} is a ${dog.breed}.`
        : `${dog.name}'s breed is not specified.`;
    }
    if (basicQueries.name.test(message)) {
      return `Your dog's name is ${dog.name}.`;
    }

    // Classify query and get appropriate context
    const queryType = classifyQuery(message);
    const optimizedContext = getOptimizedContext(context, queryType);

    // Select appropriate model and context based on query type
    let model: "gpt-4-1106-preview" | "gpt-3.5-turbo" = "gpt-3.5-turbo";
    let maxTokens = 150;
    let systemPrompt = SYSTEM_PROMPT;

    if (queryType === "complex") {
      model = "gpt-4-1106-preview";
      maxTokens = 500;
      // Add detailed training analysis for complex queries
      const analysis = {
        dogs: trainingData.dogs.map((dog) => ({
          name: dog.name,
          breed: dog.breed,
          age_years: dog.age_years,
          training_level: determineTrainingLevel(dog, trainingData.plans),
        })),
        active_plans: trainingData.plans
          .filter((plan) => plan.status === "in_progress")
          .slice(-2)
          .map((plan) => ({
            title: plan.title,
            progress: plan.progress_percentage,
            performance: analyzePerformance(plan),
          })),
      };
      systemPrompt += `\n\nUser's Current Training Status:\n${
        JSON.stringify(
          analysis,
          null,
          2,
        )
      }`;
    } else if (queryType === "training") {
      model = "gpt-4-1106-preview";
      maxTokens = 300;
      // Add basic training info for training queries
      systemPrompt += `\n\nDog: ${dog.name} (${
        dog.breed || "Unknown breed"
      }, ${dog.age} years)
Training Level: ${determineTrainingLevel(dog, trainingData.plans)}`;
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...optimizedContext,
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) {
      throw new Error("No response from OpenAI");
    }

    return reply;
  } catch (error) {
    console.error("OpenAI API error:", error);
    if (
      error instanceof Error &&
      error.message.includes("maximum context length")
    ) {
      return "I'm having trouble processing your request. Could you try asking in a simpler way?";
    }
    return "I encountered an issue. Please try again with your question.";
  }
}

// Helper functions for analyzing training data
function determineTrainingLevel(dog: Dog, plans: TrainingPlan[]) {
  const completedPlans = plans.filter((p) => p.status === "completed");
  if (completedPlans.length === 0) return "beginner";
  const hasAdvanced = completedPlans.some((p) => p.difficulty === "advanced");
  const hasIntermediate = completedPlans.some(
    (p) => p.difficulty === "intermediate",
  );
  return hasAdvanced
    ? "advanced"
    : hasIntermediate
    ? "intermediate"
    : "beginner";
}

function getCurrentFocus(plan: TrainingPlan & { steps?: any[] }) {
  const currentStep = plan.steps?.find((step) => !step.completed);
  return currentStep
    ? {
      step: currentStep.title,
      description: currentStep.description,
      day: currentStep.day_number,
    }
    : null;
}

function analyzePerformance(
  plan: TrainingPlan & {
    progress_percentage?: number;
    average_rating?: number | null;
    total_sessions?: number;
  },
) {
  return {
    progress: plan.progress_percentage,
    rating: plan.average_rating,
    consistency: plan.total_sessions && plan.total_sessions > 0
      ? "regular"
      : "needs_improvement",
    status: getPerformanceStatus(plan),
  };
}

function getPerformanceStatus(plan: { average_rating?: number | null }) {
  if (!plan.average_rating) return "just_started";
  if (plan.average_rating >= 4) return "excellent";
  if (plan.average_rating >= 3) return "good";
  return "needs_support";
}

function getRecentAchievements(sessions: TrainingSession[]) {
  return sessions
    .filter((session) => session.rating && session.rating >= 4)
    .map((session) => ({
      date: session.completed_at,
      rating: session.rating,
    }))
    .slice(0, 3);
}

export async function generateTrainingPlan({
  dogName,
  breed,
  date_of_birth,
  goal,
  difficulty,
  durationWeeks,
  sessionsPerWeek,
  behaviorToCorrect,
}: {
  dogName: string;
  breed?: string;
  date_of_birth?: string;
  goal: string;
  difficulty: DifficultyLevel;
  durationWeeks: number;
  sessionsPerWeek: number;
  behaviorToCorrect?: string;
}) {
  console.log("\n=== GENERATING TRAINING PLAN ===");
  console.log("Dog:", { dogName, breed, date_of_birth });

  // Calculate age from date_of_birth
  const age = date_of_birth
    ? Math.floor(
      (new Date().getTime() - new Date(date_of_birth).getTime()) /
        (1000 * 60 * 60 * 24 * 365),
    )
    : undefined;

  console.log("Training parameters:", {
    goal,
    difficulty,
    durationWeeks,
    sessionsPerWeek,
    behaviorToCorrect,
  });

  const prompt =
    `Create a ${durationWeeks}-week ${difficulty} level dog training plan for ${dogName}${
      breed ? ` (${breed})` : ""
    }${
      age ? `, age ${age} years` : ""
    }, with ${sessionsPerWeek} training sessions per week.
${
      behaviorToCorrect
        ? `Primary focus: Correcting the following behavior issue: ${behaviorToCorrect}
This behavior should be addressed through positive reinforcement techniques, while also working towards the overall training goal.`
        : ""
    }
Overall training goal: ${goal}

Please provide a structured plan that:
${
      behaviorToCorrect
        ? `1. Addresses the behavior issue through:
   - Understanding and managing triggers
   - Teaching alternative behaviors
   - Positive reinforcement techniques
   - Environmental management strategies
2. Integrates behavior correction with overall training goals
3. Provides clear progress markers`
        : "1. Focuses on achieving the training goal through progressive steps"
    }

Include in your response:
1. A title for the training program
2. A brief description of what will be achieved
3. A list of exactly ${
      sessionsPerWeek * durationWeeks
    } training steps (${sessionsPerWeek} sessions per week for ${durationWeeks} weeks). Each step should include:
   - Title of the exercise
   - Detailed description of how to perform it
   - Estimated duration in minutes
   - Day number in the program (spread evenly across the ${durationWeeks} weeks)
   ${
      behaviorToCorrect
        ? "- How this exercise helps with behavior correction (when applicable)"
        : ""
    }

Format the response as a JSON object with this structure:
{
  "title": "string",
  "description": "string",
  "steps": [
    {
      "title": "string",
      "description": "string",
      "dayNumber": number,
      "durationMinutes": number
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    console.log("Generated plan:", response);
    console.log("=== PLAN GENERATION COMPLETE ===\n");

    return JSON.parse(response);
  } catch (error) {
    console.error("Training plan generation error:", error);
    throw error;
  }
}

export async function suggestTrainingTip(dogProfile: {
  name: string;
  breed?: string;
  date_of_birth?: string;
}): Promise<string> {
  console.log("Generating training tip for:", dogProfile);

  // Calculate age from date_of_birth
  const age = dogProfile.date_of_birth
    ? Math.floor(
      (new Date().getTime() - new Date(dogProfile.date_of_birth).getTime()) /
        (1000 * 60 * 60 * 24 * 365),
    )
    : undefined;

  const prompt = `Provide a short, practical training tip for ${dogProfile.name}
${dogProfile.breed ? `(${dogProfile.breed})` : ""}${
    age ? `, age ${age} years` : ""
  }.
Focus on positive reinforcement${
    age ? ` and make it specific to the dog's age` : ""
  }${dogProfile.breed ? ` and breed characteristics` : ""}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    return response;
  } catch (error) {
    console.error("Training tip error:", error);
    throw error;
  }
}
