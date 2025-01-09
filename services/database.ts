import { createClient } from "@supabase/supabase-js";
import type {
  ChatMessage,
  Database,
  Dog,
  TrainingPlan,
  TrainingSession,
  TrainingStep,
} from "@/types/database";
import { client, client as supabase } from "@/lib/supabase";
import { useUser } from "@clerk/clerk-expo";

export { supabase };

export type TrainingStatus = "not_started" | "in_progress" | "completed";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// Local type definition
type TrainingPlanWithDog = TrainingPlan & {
  dog: {
    name: string;
  };
};

// Dog-related functions
export async function saveDog(
  data: Omit<Dog, "id" | "created_at" | "updated_at">,
) {
  console.log("Dog data:", data);
  const { data: dog, error } = await supabase
    .from("dogs")
    .insert([
      {
        owner_id: data.owner_id,
        name: data.name,
        breed: data.breed,
        date_of_birth: data.date_of_birth,
        weight_lbs: data.weight_lbs,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error saving dog:", error);
    throw error;
  }

  return dog;
}

export async function getDogs(userId: string) {
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateDog(
  dogId: string,
  updates: Database["public"]["Tables"]["dogs"]["Update"],
) {
  const { data, error } = await supabase
    .from("dogs")
    .update(updates)
    .eq("id", dogId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDog(dogId: string) {
  const { error } = await supabase.from("dogs").delete().eq("id", dogId);

  if (error) throw error;
}

// Training plan functions
export async function getDogById(dogId: string): Promise<Dog | null> {
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", dogId)
    .single();

  if (error) {
    console.error("Error fetching dog:", error);
    return null;
  }

  return data;
}

export async function getTrainingPlans(userId: string, email?: string) {
  console.log("\n=== FETCHING TRAINING PLANS ===");
  console.log("User ID:", userId);
  console.log("Email:", email);

  try {
    // Skip profile creation if no email is provided
    if (email) {
      // First ensure the user exists in profiles
      const { error: profileError } = await client
        .from("profiles")
        .upsert({
          id: userId,
          email: email,
        });

      if (profileError) {
        console.error("Error ensuring profile exists:", profileError);
        throw profileError;
      }
    }

    // Then fetch training plans
    const { data, error } = await client
      .from("training_plans")
      .select(`
        *,
        dog:dogs (
          id,
          name
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching training plans:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getTrainingPlans:", error);
    throw error;
  }
}

export async function debugTrainingPlan(planId: string) {
  console.log("\n=== DEBUG TRAINING PLAN ===");

  // Check training plan
  const { data: plan, error: planError } = await supabase
    .from("training_plans")
    .select("*")
    .eq("id", planId)
    .single();

  console.log("Plan:", plan);
  console.log("Plan Error:", planError);

  // Check training steps directly
  const { data: steps, error: stepsError } = await supabase
    .from("training_steps")
    .select("*")
    .eq("plan_id", planId);

  console.log("Steps:", steps);
  console.log("Steps Error:", stepsError);

  // Check RLS policies
  const { data: policies, error: policiesError } = await supabase.rpc(
    "get_policies",
    { table_name: "training_steps" },
  );

  console.log("RLS Policies:", policies);
  console.log("Policies Error:", policiesError);

  console.log("=== END DEBUG ===\n");
}

export async function saveTrainingPlan(
  plan: Omit<TrainingPlan, "id" | "created_at" | "updated_at"> & {
    steps?: Array<{
      title: string;
      description: string;
      dayNumber?: number;
      durationMinutes?: number;
      day_number?: number;
      duration_minutes?: number;
    }>;
    difficulty: DifficultyLevel;
    status?: TrainingStatus;
  },
) {
  console.log("Saving training plan to database:", plan);
  try {
    // Transform steps to use snake_case and ensure all required fields
    const formattedSteps = plan.steps?.map((step) => {
      if (
        !step.title ||
        !step.description ||
        (step.dayNumber === undefined && step.day_number === undefined) ||
        (step.durationMinutes === undefined &&
          step.duration_minutes === undefined)
      ) {
        console.error("Invalid step data:", step);
        throw new Error("Missing required step data");
      }

      return {
        title: step.title,
        description: step.description,
        day_number: step.dayNumber ?? step.day_number,
        duration_minutes: step.durationMinutes ?? step.duration_minutes,
      };
    });

    console.log("Formatted steps before saving:", formattedSteps);

    // Start a Supabase transaction
    const { data: planData, error: planError } = await supabase.rpc(
      "create_training_plan",
      {
        p_dog_id: plan.dog_id,
        p_user_id: plan.user_id,
        p_title: plan.title || "Training Plan",
        p_description: plan.description || "",
        p_behavior_to_correct: plan.behavior_to_correct || "",
        p_difficulty: plan.difficulty,
        p_duration_weeks: plan.duration_weeks,
        p_status: plan.status || "not_started",
        p_steps: formattedSteps,
      },
    );

    if (planError) {
      console.error("Error saving training plan:", planError);
      throw planError;
    }

    if (!planData) {
      throw new Error("No data returned from create_training_plan");
    }

    console.log("Training plan saved with data:", planData);

    console.log("Plan saved, debugging...");
    await debugTrainingPlan(planData.id);

    // Return the plan with the dog information
    const result = {
      ...planData,
      dog: {
        name: planData.dog_name,
      },
    };

    console.log("Training plan saved successfully:", result);
    return result;
  } catch (error) {
    console.error("Error in saveTrainingPlan:", error);
    throw error;
  }
}

export async function updateTrainingPlanStatus(
  planId: string,
  status: TrainingStatus,
) {
  console.log("Updating training plan status:", { planId, status });

  try {
    const { data, error } = await supabase
      .from("training_plans")
      .update({ status })
      .eq("id", planId)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan status:", error);
      throw error;
    }

    if (!data) {
      throw new Error("No data returned from update");
    }

    console.log("Successfully updated plan status:", data);
    return data;
  } catch (error) {
    console.error("Failed to update plan status:", error);
    throw error;
  }
}

// Training steps functions
export async function createTrainingStep(
  step: Database["public"]["Tables"]["training_steps"]["Insert"],
) {
  const { data, error } = await supabase
    .from("training_steps")
    .insert(step)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrainingStep(
  stepId: number,
  updates: { completed: boolean },
) {
  console.log("\n=== UPDATING TRAINING STEP ===");
  console.log("Step ID:", stepId);
  console.log("Updates:", updates);

  try {
    // Update the step directly - RLS policies will handle access control
    const { data: updatedStep, error: updateError } = await supabase
      .from("training_steps")
      .update(updates)
      .eq("id", stepId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating step:", updateError);
      throw updateError;
    }

    if (!updatedStep) {
      throw new Error("Failed to update step");
    }

    console.log("Successfully updated step:", updatedStep);
    return updatedStep;
  } catch (error) {
    console.error("Failed to update step:", error);
    throw error;
  }
}

// Training sessions functions
export async function createTrainingSession(
  session: Omit<TrainingSession, "id">,
): Promise<TrainingSession> {
  console.log("Creating training session:", session);

  try {
    const { data, error } = await supabase
      .from("training_sessions")
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error("Error creating training session:", error);
      throw error;
    }

    if (!data) {
      throw new Error("No data returned from insert");
    }

    console.log("Successfully created training session:", data);
    return data;
  } catch (error) {
    console.error("Failed to create training session:", error);
    throw error;
  }
}

export async function getTrainingSessions(dogId: string) {
  const { data, error } = await supabase
    .from("training_sessions")
    .select(
      `
      *,
      training_steps (*)
    `,
    )
    .eq("dog_id", dogId)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Chat history functions
export async function saveChatMessage(message: {
  user_id: string;
  message: string;
  ai_response: string;
}): Promise<ChatMessage> {
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .insert({
        user_id: message.user_id,
        message: message.message,
        ai_response: message.ai_response,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving chat message:", error);
      throw error;
    }

    if (!data) {
      throw new Error("No data returned from insert");
    }

    return data;
  } catch (error) {
    console.error("Failed to save chat message:", error);
    throw error;
  }
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }

  return data || [];
}

export async function getTrainingPlanById(
  planId: string,
): Promise<TrainingPlanWithDog | null> {
  const { data, error } = await supabase
    .from("training_plans")
    .select(
      `
      *,
      dog:dogs(name)
    `,
    )
    .eq("id", planId)
    .single();

  if (error) {
    console.error("Error fetching training plan:", error);
    return null;
  }

  return data as TrainingPlanWithDog;
}

export async function getTrainingSteps(planId: string) {
  console.log("\n=== GETTING TRAINING STEPS ===");
  console.log("Training Plan ID:", planId);

  try {
    console.log("Fetching steps...");
    const { data, error } = await supabase
      .from("training_steps")
      .select("*")
      .eq("plan_id", planId)
      .order("day_number", { ascending: true });

    if (error) {
      console.error("Error fetching training steps:", error);
      return [];
    }

    console.log("Steps data received:", data);
    return data || [];
  } catch (error) {
    console.error("Failed to get training steps:", error);
    return [];
  }
}

export async function deleteTrainingPlan(planId: string) {
  console.log("\n=== Supabase deleteTrainingPlan START ===");
  console.log("🎯 Training Plan ID to delete:", planId);

  try {
    // Delete training steps first
    const { error: stepsError } = await supabase
      .from("training_steps")
      .delete()
      .eq("plan_id", planId);

    if (stepsError) {
      console.error("💥 Delete steps failed:", stepsError);
      throw stepsError;
    }

    // Delete the training plan
    const { data, error } = await supabase
      .from("training_plans")
      .delete()
      .eq("id", planId)
      .select();

    console.log("🗑️ Delete response:", { data, error });

    if (error) {
      console.error("💥 Delete plan failed:", error);
      throw error;
    }

    console.log("✅ Training plan successfully deleted");
    console.log("=== Supabase deleteTrainingPlan END ===\n");

    return { data, error: null };
  } catch (error) {
    console.error("❌ Error in deleteTrainingPlan:", error);
    return { data: null, error };
  }
}

export async function createProfile(
  userId: string,
  email: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    email: email,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
}

export async function getUserProfile(userId: string) {
  try {
    // Add defensive check to ensure supabase client is initialized
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { data: dogs, error: dogsError } = await supabase
      .from("dogs")
      .select("*")
      .eq("owner_id", userId);

    if (dogsError) {
      console.error("Error fetching dogs:", dogsError);
      throw dogsError;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    return {
      profile,
      dogs: dogs || [],
    };
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    throw error;
  }
}

// Functions for AI to query training data
export async function getTrainingDataForAI(userId: string) {
  // First get dogs
  const { data: dogsData, error: dogsError } = await supabase
    .from("dogs")
    .select("*")
    .eq("owner_id", userId);

  if (dogsError) throw dogsError;

  // Then get all other data in parallel
  const [plans, sessions, chatHistory] = await Promise.all([
    supabase
      .from("training_plans")
      .select(
        `
        *,
        dog:dogs (
          name,
          breed,
          date_of_birth,
          weight_lbs
        ),
        steps:training_steps (
          *,
          sessions:training_sessions (
            completed_at,
            rating,
            notes
          )
        )
      `,
      )
      .eq("user_id", userId),
    supabase
      .from("training_sessions")
      .select(
        `
        *,
        step:training_steps (
          title,
          description,
          day_number
        )
      `,
      )
      .eq("dog_id", dogsData?.[0]?.id)
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (plans.error) throw plans.error;
  if (sessions.error) throw sessions.error;
  if (chatHistory.error) throw chatHistory.error;

  // Calculate progress and success metrics
  const enhancedPlans = plans.data?.map((plan: any) => {
    const steps = plan.steps || [];
    const completedSteps = steps.filter((step: any) => step.completed).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Calculate average rating for this plan's sessions
    const ratings = steps
      .flatMap((step: any) => step.sessions || [])
      .map((session: any) => session.rating)
      .filter(Boolean);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : null;

    return {
      ...plan,
      progress_percentage: progress,
      average_rating: avgRating,
      total_sessions: ratings.length,
    };
  });

  return {
    plans: enhancedPlans,
    dogs: dogsData,
    recent_sessions: sessions.data,
    recent_interactions: chatHistory.data,
  };
}

// Add the new interface for training session
export interface TrainingSessionInput {
  step_id: number;
  dog_id: number;
  completed_at: string;
  achievements: string;
  challenges: string;
  duration_minutes: number;
  repetitions: number;
  environment_notes: string;
  dog_mood: string;
  rating: number;
  treats_used: string;
  trainer_mood: string;
  next_steps: string;
}

// Add the function to save training session
export async function saveTrainingSession(session: TrainingSessionInput) {
  try {
    // Ensure IDs are numbers
    const sanitizedSession = {
      ...session,
      step_id: typeof session.step_id === "string"
        ? parseInt(session.step_id, 10)
        : session.step_id,
      dog_id: typeof session.dog_id === "string"
        ? parseInt(session.dog_id, 10)
        : session.dog_id,
    };

    const { data, error } = await supabase
      .from("training_sessions")
      .insert([sanitizedSession])
      .select()
      .single();

    if (error) {
      console.error("Error saving training session:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to save training session:", error);
    throw error;
  }
}

// Add new function to sync Clerk user with Supabase profile
export async function syncClerkUser(email: string) {
  console.log("\n=== SYNCING CLERK USER ===");
  console.log("Email:", email);

  try {
    // Check if a profile exists with this email
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    // Don't throw error if profile doesn't exist
    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking for existing profile:", profileError);
      throw profileError;
    }

    if (existingProfile) {
      console.log("Found existing profile:", existingProfile);
      return existingProfile;
    }

    // If no profile exists, create one
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert([{ email }])
      .select()
      .single();

    if (createError) {
      console.error("Error creating new profile:", createError);
      throw createError;
    }

    console.log("Created new profile:", newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error in syncClerkUser:", error);
    throw error;
  }
}
