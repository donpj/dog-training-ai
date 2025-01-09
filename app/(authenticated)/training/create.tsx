import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useUser } from "@clerk/clerk-expo";
import { generateTrainingPlan } from "@/services/openai";
import { saveTrainingPlan, saveDog, getUserProfile } from "@/services/database";
import {
  TrainingPlan as DBTrainingPlan,
  DifficultyLevel,
  Dog,
} from "@/types/database";
import { Colors } from "@/constants/Colors";

interface AIStep {
  title: string;
  description: string;
  dayNumber: number;
  durationMinutes: number;
}

export default function CreatePlanScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [formData, setFormData] = useState({
    selectedDogIds: [] as number[],
    goal: "",
    behaviorToCorrect: "",
    difficulty: "beginner" as DifficultyLevel,
    durationWeeks: "4",
    sessionsPerWeek: "3",
    daysPerWeek: ["Monday", "Wednesday", "Friday"] as string[],
  });

  useEffect(() => {
    if (isLoaded && user) {
      loadDogs();
    }
  }, [isLoaded, user, refresh]);

  const loadDogs = async () => {
    try {
      const { dogs: userDogs } = await getUserProfile(user!.id);
      setDogs(userDogs || []);
    } catch (error) {
      console.error("Error loading dogs:", error);
    }
  };

  const toggleDogSelection = (dogId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedDogIds: prev.selectedDogIds.includes(dogId)
        ? prev.selectedDogIds.filter((id) => id !== dogId)
        : [...prev.selectedDogIds, dogId],
    }));
  };

  const handleSubmit = async () => {
    if (formData.selectedDogIds.length === 0 || !formData.goal) {
      Alert.alert(
        "Error",
        "Please select at least one dog and specify a training goal"
      );
      return;
    }

    if (!isLoaded || !user) {
      Alert.alert("Error", "You must be logged in to create a training plan");
      return;
    }

    setLoading(true);
    try {
      // Create a training plan for each selected dog
      for (const dogId of formData.selectedDogIds) {
        const selectedDog = dogs.find((d) => d.id === dogId)!;

        // Generate plan using AI
        const aiPlan = await generateTrainingPlan({
          dogName: selectedDog.name,
          breed: selectedDog.breed || undefined,
          date_of_birth: selectedDog.date_of_birth || undefined,
          goal: formData.goal,
          difficulty: formData.difficulty,
          durationWeeks: parseInt(formData.durationWeeks, 10),
          sessionsPerWeek: parseInt(formData.sessionsPerWeek, 10),
          behaviorToCorrect: formData.behaviorToCorrect,
        });

        await saveTrainingPlan({
          dog_id: dogId,
          user_id: user.id,
          title: aiPlan.title,
          description: aiPlan.description,
          behavior_to_correct: formData.behaviorToCorrect,
          difficulty: formData.difficulty,
          duration_weeks: parseInt(formData.durationWeeks, 10),
          sessions_per_week: parseInt(formData.sessionsPerWeek, 10),
          training_days: formData.daysPerWeek,
          status: "not_started",
          steps: aiPlan.steps.map((step: AIStep) => ({
            title: step.title,
            description: step.description,
            day_number: step.dayNumber,
            duration_minutes: step.durationMinutes,
          })),
        });
      }

      Alert.alert(
        "Success",
        `Training plan${
          formData.selectedDogIds.length > 1 ? "s" : ""
        } created successfully!`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("\n=== ERROR CREATING PLAN ===");
      console.error("Error details:", error);
      console.error("Form data at time of error:", formData);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create training plan"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.headerButton, { color: tintColor }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Training Plan</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.headerButton, { color: tintColor }]}>
            {loading ? "Creating..." : "Create"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {dogs.length === 0 ? (
            <View style={styles.noDogs}>
              <Text style={styles.noDogsText}>
                You haven't added any dogs yet
              </Text>
              <TouchableOpacity
                style={[styles.addDogButton, { backgroundColor: tintColor }]}
                onPress={() => router.push("/dogs/new")}
              >
                <Text style={styles.addDogButtonText}>Add a Dog</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Select Dogs *</Text>
                <TouchableOpacity
                  onPress={() => router.push("/dogs/new")}
                  style={[styles.addDogLink, { borderColor: tintColor }]}
                >
                  <Text style={[styles.addDogLinkText, { color: tintColor }]}>
                    + Add New Dog
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dogsGrid}>
                {dogs.map((dog) => (
                  <TouchableOpacity
                    key={dog.id}
                    style={[
                      styles.dogCard,
                      formData.selectedDogIds.includes(dog.id) && {
                        backgroundColor: `${tintColor}20`,
                        borderColor: tintColor,
                      },
                    ]}
                    onPress={() => toggleDogSelection(dog.id)}
                  >
                    <Text
                      style={[
                        styles.dogName,
                        formData.selectedDogIds.includes(dog.id) && {
                          color: tintColor,
                        },
                      ]}
                    >
                      {dog.name}
                    </Text>
                    {dog.breed && (
                      <Text style={styles.dogBreed}>{dog.breed}</Text>
                    )}
                    {dog.date_of_birth && (
                      <Text style={styles.dogAge}>
                        {Math.floor(
                          (new Date().getTime() -
                            new Date(dog.date_of_birth).getTime()) /
                            (1000 * 60 * 60 * 24 * 365)
                        )}{" "}
                        years
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Behavior to Correct</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.behaviorToCorrect}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, behaviorToCorrect: text }))
              }
              placeholder="What behavior would you like to correct? (e.g., pulling on leash, excessive barking)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Training Goal *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.goal}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, goal: text }))
              }
              placeholder="What would you like to achieve with this training?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Difficulty Level</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.difficulty}
                onValueChange={(
                  value: "beginner" | "intermediate" | "advanced"
                ) => setFormData((prev) => ({ ...prev, difficulty: value }))}
              >
                <Picker.Item label="Beginner" value="beginner" />
                <Picker.Item label="Intermediate" value="intermediate" />
                <Picker.Item label="Advanced" value="advanced" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.durationWeeks}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, durationWeeks: value }))
                }
              >
                <Picker.Item label="2 weeks" value="2" />
                <Picker.Item label="4 weeks" value="4" />
                <Picker.Item label="6 weeks" value="6" />
                <Picker.Item label="8 weeks" value="8" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Days per Week</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.daysPerWeek.length.toString()}
                onValueChange={(value: string) => {
                  const days = ["Monday", "Wednesday", "Friday"];
                  if (value === "2") days.pop();
                  if (value === "4") days.push("Thursday");
                  if (value === "5") days.push("Thursday", "Tuesday");
                  setFormData((prev) => ({ ...prev, daysPerWeek: days }));
                }}
              >
                <Picker.Item label="2 days/week" value="2" />
                <Picker.Item label="3 days/week" value="3" />
                <Picker.Item label="4 days/week" value="4" />
                <Picker.Item label="5 days/week" value="5" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sessions per Week</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.sessionsPerWeek}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, sessionsPerWeek: value }))
                }
              >
                <Picker.Item label="2 sessions/week" value="2" />
                <Picker.Item label="3 sessions/week" value="3" />
                <Picker.Item label="4 sessions/week" value="4" />
                <Picker.Item label="5 sessions/week" value="5" />
              </Picker>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  headerButton: {
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
  },
  noDogs: {
    alignItems: "center",
    padding: 20,
  },
  noDogsText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  addDogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addDogButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dogsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  dogCard: {
    width: "45%",
    margin: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
  },
  dogName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  dogBreed: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  dogAge: {
    fontSize: 14,
    color: "#666",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addDogLink: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addDogLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dogBehavior: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f8f8f8",
  },
  dayButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
});
