import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  useLocalSearchParams,
  useRouter,
  Stack,
  useFocusEffect,
} from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  getTrainingPlanById,
  updateTrainingPlanStatus,
  getTrainingSteps,
  deleteTrainingPlan,
} from "@/services/database";
import {
  TrainingPlan as DBTrainingPlan,
  TrainingStatus,
  Dog,
  TrainingStep,
} from "@/types/database";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "@/components/ui/IconSymbol";

type TrainingPlanWithDog = DBTrainingPlan & {
  dog: Pick<Dog, "name">;
};

export default function TrainingDetailsScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<TrainingPlanWithDog | null>(null);
  const [steps, setSteps] = useState<TrainingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const isOwner = plan?.user_id === user?.id;

  useEffect(() => {
    if (isLoaded && user && id) {
      loadPlan();
    }
  }, [isLoaded, user, id]);

  // Add focus effect to reload data
  useFocusEffect(
    useCallback(() => {
      if (isLoaded && user && id) {
        loadPlan();
      }
    }, [isLoaded, user, id])
  );

  const loadPlan = async () => {
    try {
      console.log("Loading plan and steps for ID:", id);
      const [planData, stepsData] = await Promise.all([
        getTrainingPlanById(id as string),
        getTrainingSteps(id as string),
      ]);
      console.log("Loaded plan:", planData);
      console.log("Loaded steps:", stepsData);
      setPlan(planData);
      setSteps(stepsData || []);
    } catch (error) {
      console.error("Error loading plan:", error);
      Alert.alert("Error", "Failed to load training plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Current steps in state:", steps);
  }, [steps]);

  const handleStartTraining = async () => {
    if (!plan || updating) return;

    try {
      setUpdating(true);
      await updateTrainingPlanStatus(plan.id.toString(), "in_progress");

      // Refresh the plan data
      const updatedPlan = await getTrainingPlanById(plan.id.toString());
      setPlan(updatedPlan);

      Alert.alert(
        "Success",
        "Training plan started! Let's begin your training journey.",
        [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/training/[id]/session",
                params: { id: plan.id.toString(), stepIndex: "0" },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error starting training:", error);
      Alert.alert("Error", "Failed to start training plan");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!plan || updating) return;

    Alert.alert(
      "Delete Training Plan",
      "Are you sure you want to delete this training plan? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setUpdating(true);
              await deleteTrainingPlan(plan.id.toString());
              router.back();
            } catch (error) {
              console.error("Error deleting plan:", error);
              Alert.alert("Error", "Failed to delete training plan");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={tintColor} />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Training plan not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : plan ? (
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <IconSymbol name="chevron.left" size={24} color={tintColor} />
                <Text style={[styles.backText, { color: tintColor }]}>
                  Back
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                Training Plan
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isOwner && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Text
                    style={{ color: "#ff3b30", marginRight: 8, fontSize: 17 }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <View style={styles.planMeta}>
                <Text style={styles.planDog}>{plan.dog.name}</Text>
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor:
                        Colors.difficulty[
                          plan.difficulty as keyof typeof Colors.difficulty
                        ] + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      {
                        color:
                          Colors.difficulty[
                            plan.difficulty as keyof typeof Colors.difficulty
                          ],
                      },
                    ]}
                  >
                    {plan.difficulty}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.description}>{plan.description}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duration</Text>
              <Text style={styles.sectionText}>
                {plan.duration_weeks} weeks
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <Text style={styles.sectionText}>{plan.status}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Training Steps</Text>
              {steps.length > 0 ? (
                steps.map((step, index) => (
                  <TouchableOpacity
                    key={step.id}
                    onPress={() =>
                      router.push({
                        pathname: "/training/[id]/session",
                        params: {
                          id: plan.id.toString(),
                          stepIndex: index.toString(),
                          timestamp: Date.now().toString(),
                        },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.stepCard}>
                      <View style={styles.stepHeader}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDuration}>
                          {step.duration_minutes} min
                        </Text>
                      </View>
                      <Text style={styles.stepDescription}>
                        {step.description}
                      </Text>
                      {step.completed && (
                        <View style={styles.completedBadge}>
                          <IconSymbol
                            size={16}
                            name="checkmark.circle.fill"
                            color={tintColor}
                          />
                          <Text
                            style={[styles.completedText, { color: tintColor }]}
                          >
                            Completed
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No training steps available
                </Text>
              )}
            </View>
          </ScrollView>

          {(plan.status === "not_started" || plan.status === "in_progress") && (
            <View style={styles.bottomContainer}>
              {plan.status === "not_started" && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: tintColor },
                    updating && styles.actionButtonDisabled,
                  ]}
                  onPress={handleStartTraining}
                  disabled={updating}
                >
                  <Text style={styles.buttonText}>
                    {updating ? "Starting..." : "Start Training"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      ) : (
        <Text style={styles.errorText}>Training plan not found</Text>
      )}
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
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  planHeader: {
    marginBottom: 24,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  planMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planDog: {
    fontSize: 16,
    fontWeight: "500",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: "#666",
  },
  stepCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  stepDuration: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 12,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 24,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
});
