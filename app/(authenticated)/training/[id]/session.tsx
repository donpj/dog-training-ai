import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  getTrainingSteps,
  updateTrainingStep,
  updateTrainingPlanStatus,
  createTrainingSession,
  supabase,
} from "@/services/database";
import { TrainingStep, TrainingSession } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { IconSymbol } from "@/components/ui/IconSymbol";
import Slider from "@react-native-community/slider";
import { PostgrestError } from "@supabase/supabase-js";

const MOODS = [
  "Happy",
  "Excited",
  "Calm",
  "Anxious",
  "Tired",
  "Distracted",
] as const;
const TRAINER_MOODS = ["Confident", "Patient", "Frustrated", "Tired"] as const;
const ENVIRONMENTS = [
  "Indoor",
  "Outdoor",
  "Quiet",
  "Noisy",
  "With other dogs",
  "With distractions",
] as const;

interface SessionForm {
  achievements: string;
  challenges: string;
  duration_minutes: number;
  repetitions: number;
  environment_notes: string;
  dog_mood: (typeof MOODS)[number];
  rating: number;
  treats_used: string;
  trainer_mood: (typeof TRAINER_MOODS)[number];
  next_steps: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function TrainingSessionScreen() {
  console.log("\n=== TRAINING SESSION SCREEN MOUNTED ===");

  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const router = useRouter();
  const { id, stepIndex } = useLocalSearchParams();
  const { user, isLoaded } = useUser();

  console.log("Initial render with params:", { id, stepIndex });

  const [steps, setSteps] = useState<TrainingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dogId, setDogId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(
    stepIndex ? parseInt(stepIndex as string) : 0
  );
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(
    []
  );
  const [sessionForm, setSessionForm] = useState<SessionForm>({
    achievements: "",
    challenges: "",
    duration_minutes: 15,
    repetitions: 0,
    environment_notes: "",
    dog_mood: MOODS[0],
    rating: 3,
    treats_used: "",
    trainer_mood: TRAINER_MOODS[0],
    next_steps: "",
  });
  const [isEditMode, setIsEditMode] = useState(true);
  const [savedSession, setSavedSession] = useState<TrainingSession | null>(
    null
  );

  useEffect(() => {
    console.log("\n=== CHECKING EFFECT CONDITIONS ===");
    console.log({
      isLoaded,
      hasUser: !!user,
      hasId: !!id,
    });

    if (isLoaded && user && id) {
      console.log("All conditions met, loading steps...");
      loadSteps();
      // Get the dog ID from the training plan
      supabase
        .from("training_plans")
        .select("dog_id")
        .eq("id", id)
        .single()
        .then(
          ({
            data,
            error,
          }: {
            data: { dog_id: string } | null;
            error: PostgrestError | null;
          }) => {
            if (error) {
              console.error("Error fetching dog ID:", error);
              return;
            }
            if (data) {
              setDogId(data.dog_id);
            }
          }
        );
    } else {
      console.log("Some conditions not met, skipping load");
    }
  }, [isLoaded, user, id]);

  useEffect(() => {
    // Load saved session data when step is completed
    const loadSavedSession = async () => {
      if (steps.length > 0 && currentStepIndex < steps.length) {
        try {
          console.log("\n=== LOADING SAVED SESSION ===");
          console.log("Step ID:", steps[currentStepIndex].id);

          const { data, error } = await supabase
            .from("training_sessions")
            .select("*")
            .eq("step_id", steps[currentStepIndex].id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error && error.code !== "PGRST116") {
            console.error("Error loading saved session:", error);
            return;
          }

          if (data) {
            console.log("Found saved session:", data);
            // Only update if the session is different
            if (!savedSession || savedSession.id !== data.id) {
              setSavedSession(data);
              // Update form with saved data
              setSessionForm({
                achievements: data.achievements,
                challenges: data.challenges,
                duration_minutes: data.duration_minutes,
                repetitions: data.repetitions,
                environment_notes: data.environment_notes,
                dog_mood: data.dog_mood,
                rating: data.rating,
                treats_used: data.treats_used,
                trainer_mood: data.trainer_mood,
                next_steps: data.next_steps,
              });
              setSelectedEnvironments(data.environments || []);
            }

            // Only update steps if completion status changed
            if (!steps[currentStepIndex].completed) {
              const updatedSteps = [...steps];
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                completed: true,
              };
              setSteps(updatedSteps);
            }
          } else {
            console.log("No saved session found");
          }
        } catch (error) {
          console.error("Error loading saved session:", error);
        }
      }
    };

    loadSavedSession();
  }, [steps, currentStepIndex]);

  useEffect(() => {
    // Set edit mode based on step completion status
    if (steps.length > 0 && currentStepIndex < steps.length) {
      setIsEditMode(!steps[currentStepIndex].completed);
    }
  }, [steps, currentStepIndex]);

  const loadSteps = async () => {
    console.log("\n=== LOADING STEPS ===");
    console.log("Training Plan ID:", id);

    try {
      console.log("Fetching steps...");
      const stepsData = await getTrainingSteps(id as string);
      console.log("Steps data received:", stepsData);

      setSteps(stepsData);

      if (!stepIndex) {
        const firstUncompleted = stepsData.findIndex((step) => !step.completed);
        setCurrentStepIndex(firstUncompleted >= 0 ? firstUncompleted : 0);
        console.log(
          "Set current step index to:",
          firstUncompleted >= 0 ? firstUncompleted : 0
        );
      }
    } catch (error) {
      console.error("Error loading steps:", error);
      Alert.alert("Error", "Failed to load training steps");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};

    if (!sessionForm.achievements.trim()) {
      errors.achievements = "Please enter achievements";
    }
    if (!sessionForm.challenges.trim()) {
      errors.challenges = "Please enter any challenges or challenges";
    }
    if (sessionForm.duration_minutes < 1) {
      errors.duration_minutes = "Duration must be at least 1 minute";
    }
    if (sessionForm.rating < 1 || sessionForm.rating > 10) {
      errors.rating = "Rating must be between 1 and 10";
    }

    return errors;
  };

  const handleCompleteStep = async () => {
    try {
      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors as FormErrors);
        return;
      }

      if (!dogId) {
        Alert.alert("Error", "No dog ID found");
        return;
      }

      // Create training session first
      const sessionData = {
        ...sessionForm,
        step_id: steps[currentStepIndex].id,
        dog_id: parseInt(dogId, 10),
        completed_at: new Date().toISOString(),
        environments: selectedEnvironments,
      };

      console.log("Creating training session:", sessionData);
      const savedSession = await createTrainingSession(sessionData);
      console.log("Training session created:", savedSession);

      // Then mark step as completed
      console.log("Marking step as completed:", steps[currentStepIndex].id);
      await updateTrainingStep(steps[currentStepIndex].id, {
        completed: true,
      });
      console.log("Step marked as completed");

      // Update local state
      const updatedSteps = [...steps];
      updatedSteps[currentStepIndex] = {
        ...updatedSteps[currentStepIndex],
        completed: true,
      };
      setSteps(updatedSteps);
      setSavedSession(savedSession);

      // Check if all steps are completed
      const allStepsCompleted = updatedSteps.every((step) => step.completed);
      if (allStepsCompleted) {
        // Update training plan status to completed
        await updateTrainingPlanStatus(id as string, "completed");
      }

      setIsEditMode(false);

      // Show success message
      Alert.alert("Success", "Training step completed successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error completing step:", error);
      Alert.alert("Error", "Failed to complete training step");
    }
  };

  const renderSessionForm = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        Session Details
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Achievements</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: formErrors.achievements ? "red" : "#ccc",
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          value={sessionForm.achievements}
          onChangeText={(text) =>
            setSessionForm({ ...sessionForm, achievements: text })
          }
          placeholder="What did your dog master today?"
          multiline
        />
        {formErrors.achievements && (
          <Text style={{ color: "red", fontSize: 12 }}>
            {formErrors.achievements}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Challenges</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: formErrors.challenges ? "red" : "#ccc",
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          value={sessionForm.challenges}
          onChangeText={(text) =>
            setSessionForm({ ...sessionForm, challenges: text })
          }
          placeholder="What was challenging?"
          multiline
        />
        {formErrors.challenges && (
          <Text style={{ color: "red", fontSize: 12 }}>
            {formErrors.challenges}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>
          Duration (minutes)
        </Text>
        <Slider
          value={sessionForm.duration_minutes}
          onValueChange={(value: number) =>
            setSessionForm({ ...sessionForm, duration_minutes: value })
          }
          minimumValue={1}
          maximumValue={60}
          step={1}
          minimumTrackTintColor={tintColor}
          maximumTrackTintColor="#E9E9EB"
          thumbTintColor={tintColor}
        />
        <Text style={{ textAlign: "center" }}>
          {sessionForm.duration_minutes} minutes
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Environment</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ENVIRONMENTS.map((env) => (
            <TouchableOpacity
              key={env}
              onPress={() => {
                if (selectedEnvironments.includes(env)) {
                  setSelectedEnvironments(
                    selectedEnvironments.filter((e) => e !== env)
                  );
                } else {
                  setSelectedEnvironments([...selectedEnvironments, env]);
                }
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: selectedEnvironments.includes(env)
                  ? tintColor
                  : "#E9E9EB",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: selectedEnvironments.includes(env) ? "#fff" : "#000",
                }}
              >
                {env}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Dog's Mood</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood}
              onPress={() => setSessionForm({ ...sessionForm, dog_mood: mood })}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor:
                  sessionForm.dog_mood === mood ? tintColor : "#E9E9EB",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: sessionForm.dog_mood === mood ? "#fff" : "#000",
                }}
              >
                {mood}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Rating</Text>
        <Slider
          value={sessionForm.rating}
          onValueChange={(value: number) =>
            setSessionForm({ ...sessionForm, rating: Math.round(value) })
          }
          minimumValue={1}
          maximumValue={5}
          step={1}
          minimumTrackTintColor={tintColor}
          maximumTrackTintColor="#E9E9EB"
          thumbTintColor={tintColor}
        />
        <Text style={{ textAlign: "center" }}>
          {sessionForm.rating} out of 5
        </Text>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Treats Used</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          value={sessionForm.treats_used}
          onChangeText={(text) =>
            setSessionForm({ ...sessionForm, treats_used: text })
          }
          placeholder="What treats worked best?"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Your Mood</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TRAINER_MOODS.map((mood) => (
            <TouchableOpacity
              key={mood}
              onPress={() =>
                setSessionForm({ ...sessionForm, trainer_mood: mood })
              }
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor:
                  sessionForm.trainer_mood === mood ? tintColor : "#E9E9EB",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: sessionForm.trainer_mood === mood ? "#fff" : "#000",
                }}
              >
                {mood}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 4 }}>Next Steps</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          value={sessionForm.next_steps}
          onChangeText={(text) =>
            setSessionForm({ ...sessionForm, next_steps: text })
          }
          placeholder="What would you like to focus on next time?"
          multiline
        />
      </View>
    </View>
  );

  const renderSavedSession = () => (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={24}
            color={tintColor}
          />
          <Text style={styles.headerText}>Session Summary</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Achievements</Text>
          <Text style={styles.summaryText}>{savedSession?.achievements}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Challenges</Text>
          <Text style={styles.summaryText}>{savedSession?.challenges}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryText}>
              {savedSession?.duration_minutes} minutes
            </Text>
          </View>
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Rating</Text>
            <Text style={styles.summaryText}>
              {savedSession?.rating} out of 5
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Dog's Mood</Text>
            <Text style={styles.summaryText}>{savedSession?.dog_mood}</Text>
          </View>
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Trainer's Mood</Text>
            <Text style={styles.summaryText}>{savedSession?.trainer_mood}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Training Environment</Text>
          <Text style={styles.summaryText}>
            {savedSession?.environments?.join(", ")}
            {savedSession?.environment_notes
              ? `\n${savedSession.environment_notes}`
              : ""}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Treats Used</Text>
          <Text style={styles.summaryText}>{savedSession?.treats_used}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Next Steps</Text>
          <Text style={styles.summaryText}>{savedSession?.next_steps}</Text>
        </View>
      </View>
    </View>
  );

  const getCurrentStep = () => {
    if (!steps.length) return null;
    return steps[currentStepIndex];
  };

  const currentStep = getCurrentStep();
  const isTrainingCompleted =
    steps.length > 0 && steps.every((step) => step.completed);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Training Session",
          headerTintColor: "000",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <IconSymbol name="chevron.left" size={24} color={tintColor} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setIsEditMode(!isEditMode)}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: Colors[colorScheme ?? "light"].tint }}>
                {isEditMode ? "" : "Edit"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Loading training steps...</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {isTrainingCompleted ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={64}
                  color={tintColor}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Training Plan Completed!
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#666",
                    textAlign: "center",
                    marginBottom: 24,
                  }}
                >
                  Congratulations! You've completed all the training steps.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: tintColor,
                    padding: 16,
                    borderRadius: 8,
                    alignItems: "center",
                    width: "100%",
                  }}
                  onPress={() =>
                    router.replace("/(authenticated)/(tabs)/training")
                  }
                >
                  <Text
                    style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
                  >
                    Return to Training Plans
                  </Text>
                </TouchableOpacity>
              </View>
            ) : currentStep ? (
              <View>
                <View style={{ padding: 16 }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      marginBottom: 8,
                    }}
                  >
                    Step {currentStep.day_number}: {currentStep.title}
                  </Text>
                  <Text style={{ fontSize: 16, marginBottom: 16 }}>
                    {currentStep.description}
                  </Text>
                  {currentStep.duration_minutes && (
                    <Text style={{ fontSize: 16, marginBottom: 16 }}>
                      Recommended Duration: {currentStep.duration_minutes}{" "}
                      minutes
                    </Text>
                  )}
                </View>

                {isEditMode ? renderSessionForm() : renderSavedSession()}

                {isEditMode && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: tintColor,
                      padding: 16,
                      borderRadius: 8,
                      alignItems: "center",
                      marginHorizontal: 16,
                      marginVertical: 24,
                    }}
                    onPress={handleCompleteStep}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      Complete Session
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text>No training steps available</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 8,
  },
  summaryItem: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  summaryHalf: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 8,
  },
});
